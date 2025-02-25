// docs: https://modularfirebase.web.app/common-use-cases/firestore/

import { firebaseConfig } from "@/firebaseConfig";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  query,
  collection,
  addDoc,
  orderBy,
  updateDoc,
  limit,
  getDocs,
  writeBatch,
  deleteDoc,
  getCountFromServer,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,
  listAll,
} from "firebase/storage";
import { getAuth } from "firebase/auth";
import { DEFAULT_PREFERENCES } from "@/constants";

/**@typedef {import("@/types/llm").Model} Model */
/**@typedef {import("@/types/llm").ModelPreferences} ModelPreferences */

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const mode = import.meta.env.MODE;

export const uploadImageToFirebaseStorageBucket = async (
  base64Image,
  userID
) => {
  const storage = getStorage(app);
  // convert base64 to blob
  const byteCharacters = atob(base64Image.split(",")[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const file = new Blob([byteArray], { type: "image/jpeg" });
  // Create a storage reference from our storage service
  const storageRef = ref(storage, `images/${userID}/${Date.now()}.jpg`);
  const snapshot = await uploadBytes(storageRef, file);
  console.log("Uploaded a blob or file!");
  // return URI of the image
  return await getDownloadURL(snapshot.ref);
};

export const deleteAllUserImagesFromFirebaseStorageBucket = async (userID) => {
  const storage = getStorage(app);
  // get all files in the images/userID folder and delete them
  const storageRef = ref(storage, `images/${userID}`);
  const listRef = await listAll(storageRef);
  listRef.items.forEach(async (itemRef) => {
    await deleteObject(itemRef);
  });
  console.log("All user images deleted from Firebase Storage!");
};

export const saveUserToFirestore = async (
  userID,
  email,
  firstName,
  lastName
) => {
  try {
    // check if user already exists in the database, delete all other documents with the same userID and save with this one
    const querySnapshot = await getDocs(
      collection(db, "users", userID, "account")
    );
    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        deleteDoc(doc.ref);
      });
    }
    const docRef = await addDoc(collection(db, "users", userID, "account"), {
      userID: userID,
      email: email,
      firstName: firstName,
      lastName: lastName,
      timestamp: new Date(),
    });
    if (mode === "development") {
      console.log("User written to Firestore collection with ID: ", docRef.id);
    }
  } catch (e) {
    console.error("Error adding document to Firestore users collection: ", e);
  }
};

export const removeUserFromFirestore = async (userID) => {
  try {
    // First delete all user's images
    await deleteAllUserImagesFromFirebaseStorageBucket(userID);

    // Then delete user's account data
    await deleteCollection(db, collection(db, "users", userID, "account"), 10);
    if (mode === "development") {
      console.log("User removed from Firestore collection with ID: ", userID);
    }
    await removeUsersMemoryFromFirestore(userID);
  } catch (e) {
    console.error(
      "Error removing document from Firestore users collection: ",
      e
    );
  }
};

export const getUserObjectFromFirestore = async (userID) => {
  try {
    const userDocs = await getDocs(collection(db, "users", userID, "account"));
    // return False if user doesn't exist
    if (userDocs.empty) {
      return false;
    }
    const userDoc = userDocs.docs[0];
    const userObject = userDoc.data();
    return userObject;
  } catch (e) {
    console.error(
      "Error getting document from Firestore users collection: ",
      e
    );
  }
};

export const removeUsersMemoryFromFirestore = async (userID) => {
  try {
    // Get all conversations first to check for images
    const conversationsRef = collection(db, "memory", userID, "conversations");
    const querySnapshot = await getDocs(conversationsRef);

    // Extract and delete all images found in prompts
    const deleteImagePromises = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.prompt) {
        const imageUrls = extractFirebaseImageUrls(data.prompt);
        imageUrls.forEach((imagePath) => {
          deleteImagePromises.push(deleteImageFromFirebaseStorage(imagePath));
        });
      }
    });

    // Wait for all image deletions to complete
    if (deleteImagePromises.length > 0) {
      await Promise.all(deleteImagePromises);
    }

    // Then delete the conversations collection
    await deleteCollection(db, conversationsRef, 10);

    if (mode === "development") {
      console.log(
        "User's memory and associated images removed for ID: ",
        userID
      );
    }

    // Dispatch event when memories are deleted
    window.dispatchEvent(new Event("memoryUpdated"));
  } catch (e) {
    console.error(
      "Error removing user's memory from Firestore memory collection: ",
      e
    );
  }
};

/**
 * Grabs prompts and responses from the database.
 * @returns
 */
export const grabConversationHistory = async (userID) => {
  try {
    let history = [];
    // const querySnapshot = await getDocs(collection(db, "memory", userID, "conversations"));
    // re-write using the "where" clause to get the most recent 30 documents
    const q = query(
      collection(db, "memory", userID, "conversations"),
      orderBy("timestamp", "desc"),
      limit(20)
    );
    const querySnapshot = await getDocs(q);
    // check if the user has any history
    if (querySnapshot.empty) {
      return history;
    }
    querySnapshot.forEach((doc) => {
      let docData = doc.data();
      docData.id = doc.id;
      history.push(docData);
    });
    // sort the history by timestamp
    history.sort((a, b) => {
      return a.timestamp - b.timestamp;
    });
    // log the count of the history
    if (mode === "development") {
      console.log("Fetched Conversation history count: ", history.length);
      // log historyCount in localStorage
      console.log(
        "localStorage histCount: ",
        localStorage.getItem("histCount")
      );
    }
    return history;
  } catch (e) {
    console.error("Error getting documents: ", e);
    return [];
  }
};

export function saveFeedback(userID, pairID, emoji, feedback) {
  if (!feedback) {
    feedback = "";
  }
  addDoc(collection(db, "memory", userID, "feedback"), {
    pairID: pairID,
    emoji: emoji,
    feedback: feedback,
    timestamp: new Date(),
  })
    .then((docRef) => {
      console.log("Feedback saved to Firestore with ID: ", docRef.id);
    })
    .catch((e) => {
      console.error("Error saving feedback: ", e);
    });
}

/**
 * grabs conversation history total count from the database.
 * @returns
 * */
export const grabConversationHistoryCount = async (userID) => {
  try {
    const conversationsRef = collection(db, "memory", userID, "conversations");
    const snapshot = await getCountFromServer(conversationsRef);
    return snapshot.data().count;
  } catch (e) {
    console.error("Error getting conversation count: ", e);
    return 0;
  }
};

/**
 * Gets status from database.
 */
export const grabStatus = async () => {
  return { status: "on" }; // TODO: Implement this
};

/**
 * Gets mic status from database.
 */
export const grabMicStatus = async () => {
  return { status: "on" }; // TODO: Implement this
};

/**
 * Delete a collection, in batches of batchSize. Note that this does
 * not recursively delete subcollections of documents in the collection
 */

function deleteCollection(db, collectionRef, batchSize) {
  const q = query(collectionRef, orderBy("__name__"), limit(batchSize));

  return new Promise((resolve) => {
    deleteQueryBatch(db, q, batchSize, resolve);
  });
}

async function deleteQueryBatch(db, query, batchSize, resolve) {
  const snapshot = await getDocs(query);

  // When there are no documents left, we are done
  let numDeleted = 0;
  if (snapshot.size > 0) {
    // Delete documents in a batch
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    numDeleted = snapshot.size;
  }

  if (numDeleted < batchSize) {
    resolve();
    return;
  }

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  setTimeout(() => {
    deleteQueryBatch(db, query, batchSize, resolve);
  }, 0);
}

/**
 * Resets conversation history.
 */
export const resetConversation = async (userID) => {
  // reset the memory collection
  try {
    await deleteCollection(
      db,
      collection(db, "memory", userID, "conversations"),
      10
    );
    localStorage.setItem("histCount", 0);
    // Dispatch event when conversation is reset
    window.dispatchEvent(new Event("memoryUpdated"));
  } catch (e) {
    console.error("Error resetting memory collection: ", e);
  }
};

export const loadConversationHistoryFromFirestore = async (userID) => {
  try {
    const history = await grabConversationHistory(userID);
    if (history.length === 0) {
      return { prompts: [], responses: [], timestamps: [], pairIDs: [] };
    }
    const prompts = history.map((pair) => pair.prompt);
    const responses = history.map((pair) => pair.response);
    const timestamps = history.map((pair) => pair.timestamp.toDate().getTime());
    const pairIDs = history.map((pair) => pair.id);
    return { prompts, responses, timestamps, pairIDs };
  } catch (e) {
    console.error(e);
    return { prompts: [], responses: [], timestamps: [], pairIDs: [] };
  }
};

// make optional skipBackup set to false
export const saveScriptToFirestore = async (
  userID,
  script,
  scriptType,
  filename,
  skipBackup = false
) => {
  try {
    // check if the script is already in the database and just update the script
    const scriptExists = await isScriptInFirestore(
      userID,
      scriptType,
      filename
    );
    if (scriptExists) {
      if (!skipBackup) {
        await backupOldScriptMakeVersion(userID, scriptType, filename);
        if (mode === "development") {
          let scriptVersions = await getVersionsOfScriptFromFirestore(
            userID,
            scriptType,
            filename
          );
          console.log("Script versions in Firestore: ", scriptVersions);
        }
      }
      await updateFirestoreScript(userID, scriptType, filename, script);
      return;
    }
    const docRef = await addDoc(collection(db, "scripts", userID, scriptType), {
      script: script,
      filename: filename,
      timestamp: new Date(),
      timestampString: new Date().toISOString(),
    });
    if (mode === "development") {
      console.log(
        "Script written to Firestore collection with ID: ",
        docRef.id
      );
    }
  } catch (e) {
    console.error("Error adding document to Firestore scripts collection: ", e);
  }
};

export const backupOldScriptMakeVersion = async (
  userID,
  scriptType,
  filename
) => {
  try {
    if (mode === "development") {
      console.log(
        "Backing up old script to Firestore collection with filename: ",
        filename
      );
    }

    // Get all versions of the script
    let versions = await getVersionsOfScriptFromFirestore(
      userID,
      scriptType,
      filename
    );

    // Sort versions by version number
    versions.sort((a, b) => {
      const versionA = parseInt(a.versionNumber) || 0;
      const versionB = parseInt(b.versionNumber) || 0;
      return versionA - versionB;
    });

    // Find the latest version number by checking actual filenames in Firestore
    const querySnapshot = await getDocs(
      collection(db, "scripts", userID, scriptType)
    );
    let highestVersion = 0;

    querySnapshot.forEach((doc) => {
      const docFilename = doc.data().filename;
      if (docFilename.startsWith(filename + "-v")) {
        const versionMatch = docFilename.match(/-v(\d+)$/);
        if (versionMatch) {
          const version = parseInt(versionMatch[1]);
          highestVersion = Math.max(highestVersion, version);
        }
      }
    });

    // New version will be highest + 1
    const newVersionNumber = highestVersion + 1;
    const newFilename = `${filename}-v${newVersionNumber}`;

    // Only proceed if we have the original version to backup
    if (versions.length > 0) {
      // Get the current base version (without -v suffix)
      const baseVersionDoc = await getBaseVersion(userID, scriptType, filename);

      if (baseVersionDoc) {
        const docRef = await addDoc(
          collection(db, "scripts", userID, scriptType),
          {
            script: baseVersionDoc.script,
            filename: newFilename,
            timestamp: new Date(),
            timestampString: new Date().toISOString(),
          }
        );

        if (mode === "development") {
          console.log(
            "Old script backed up to Firestore collection with ID: ",
            docRef.id
          );
          console.log(`Created backup version: ${newFilename}`);
        }
      }
    }
  } catch (e) {
    console.error(
      "Error backing up old script to Firestore scripts collection: ",
      e
    );
  }
};

// Helper function to get the base version of a script
const getBaseVersion = async (userID, scriptType, filename) => {
  const querySnapshot = await getDocs(
    collection(db, "scripts", userID, scriptType)
  );
  let baseVersion = null;

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.filename === filename) {
      // Exact match for base version (no -v suffix)
      baseVersion = {
        script: data.script,
        filename: data.filename,
        timestamp: data.timestamp,
      };
    }
  });

  return baseVersion;
};

export const getVersionsOfScriptFromFirestore = async (
  userID,
  scriptType,
  filename
) => {
  try {
    if (mode === "development") {
      console.log(
        "Getting versions of script from Firestore collection with filename: ",
        filename
      );
    }
    const querySnapshot = await getDocs(
      collection(db, "scripts", userID, scriptType)
    );
    if (querySnapshot.empty) {
      return [];
    }
    let versions = [];
    querySnapshot.forEach((doc) => {
      // remove all spaces from the filename
      let docfileName = doc.data().filename.replace(/\s/g, "");
      // remove all spaces from the filename
      filename = filename.replace(/\s/g, "");
      if (docfileName.includes(filename)) {
        let versionNumber = 0;
        if (doc.data().filename.includes("-v")) {
          versionNumber = doc.data().filename.split("-v")[1];
          let version = {
            versionNumber: versionNumber,
            script: doc.data().script,
          };
          versions.push(version);
        } else {
          let version = {
            versionNumber: 0,
            script: doc.data().script,
            timestamp: doc.data().timestamp,
          };
          versions.push(version);
        }
      }
    });
    // sort if versions is not empty
    if (versions.length > 0) {
      // sort the versions by timestamp
      versions.sort((a, b) => {
        return a.timestamp - b.timestamp;
      });
    }
    return versions;
  } catch (e) {
    console.error(
      "Error getting document in Firestore scripts collection: ",
      e
    );
    return [];
  }
};

export const updateFirestoreScript = async (
  userID,
  scriptType,
  filename,
  script
) => {
  try {
    const querySnapshot = await getDocs(
      collection(db, "scripts", userID, scriptType)
    );
    if (querySnapshot.empty) {
      // If no document exists, create a new one
      await addDoc(collection(db, "scripts", userID, scriptType), {
        script: script,
        filename: filename,
        timestamp: new Date(),
        timestampString: new Date().toISOString(),
      });
      return;
    }

    let updated = false;
    querySnapshot.forEach((doc) => {
      let docDataFilename = doc.data().filename.replace(/\s/g, "");
      let cleanFilename = filename.replace(/\s/g, "");

      // Match the base filename (without version)
      if (docDataFilename === cleanFilename) {
        const docRef = doc.ref;
        updateDoc(docRef, {
          script: script,
          timestamp: new Date(),
          timestampString: new Date().toISOString(),
        });
        updated = true;
      }
    });

    // If no matching document was found, create a new one
    if (!updated) {
      await addDoc(collection(db, "scripts", userID, scriptType), {
        script: script,
        filename: filename,
        timestamp: new Date(),
        timestampString: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error(
      "Error updating document in Firestore scripts collection: ",
      e
    );
    throw e;
  }
};

export const isScriptInFirestore = async (userID, scriptType, filename) => {
  try {
    if (mode === "development") {
      console.log(
        "Checking if script is in Firestore collection with filename: ",
        filename
      );
    }
    const querySnapshot = await getDocs(
      collection(db, "scripts", userID, scriptType)
    );
    if (querySnapshot.empty) {
      return false;
    }
    let found = false;
    querySnapshot.forEach((doc) => {
      let docDataFilename = doc.data().filename;
      // strip the filename of any spaces
      docDataFilename = docDataFilename.replace(/\s/g, "");
      // strip filename of any spaces
      filename = filename.replace(/\s/g, "");
      if (docDataFilename === filename) {
        found = true;
      }
    });
    if (mode === "development") {
      console.log("Script found in Firestore: ", found);
    }
    return found;
  } catch (e) {
    console.error(
      "Error checking if document is in Firestore scripts collection: ",
      e
    );
    return false;
  }
};

export const renameScriptInFirestore = async (
  userID,
  scriptId,
  scriptType,
  oldFilename,
  newFilename
) => {
  try {
    if (mode === "development") {
      console.log(
        "Renaming script in Firestore collection with filename: ",
        oldFilename
      );
    }
    const querySnapshot = await getDocs(
      collection(db, "scripts", userID, scriptType)
    );
    if (querySnapshot.empty) {
      return;
    }
    querySnapshot.forEach((doc) => {
      if (doc.data().timestampString === scriptId) {
        const docRef = doc.ref;
        updateDoc(docRef, {
          filename: newFilename,
        });
      }
    });
  } catch (e) {
    console.error(
      "Error renaming document in Firestore scripts collection: ",
      e
    );
  }
};

export const deleteScriptFromFirestore = async (
  userID,
  scriptType,
  filename
) => {
  try {
    if (mode === "development") {
      console.log(
        "Deleting script from Firestore collection with filename: ",
        filename
      );
    }
    const querySnapshot = await getDocs(
      collection(db, "scripts", userID, scriptType)
    );
    if (querySnapshot.empty) {
      return;
    }
    querySnapshot.forEach((doc) => {
      if (doc.data().filename === filename) {
        deleteDoc(doc.ref);
      }
    });
  } catch (e) {
    console.error(
      "Error deleting document from Firestore scripts collection: ",
      e
    );
  }
};

export const deleteAllUserScriptsFromFirestore = async (userID) => {
  try {
    await deleteCollection(
      db,
      collection(db, "scripts", userID, "webApps"),
      10
    );
    await deleteCollection(
      db,
      collection(db, "scripts", userID, "openSCAD"),
      10
    );
    if (mode === "development") {
      console.log(
        "All user scripts removed from Firestore collection with ID: ",
        userID
      );
    }
  } catch (e) {
    console.error(
      "Error removing user's scripts from Firestore scripts collection: ",
      e
    );
  }
};

export const syncLocalScriptsWithFirestore = async (userID, scriptType) => {
  try {
    // Add a debounce mechanism using localStorage
    const now = Date.now();
    const lastSyncTime = localStorage.getItem(`lastSync_${scriptType}`);
    const SYNC_COOLDOWN = 5000; // 5 seconds cooldown between syncs

    if (lastSyncTime && now - parseInt(lastSyncTime) < SYNC_COOLDOWN) {
      // If we've synced recently, skip this sync
      return [];
    }

    if (mode === "development") {
      console.log(
        "Syncing local storage with Firestore for scripts of type: ",
        scriptType
      );
    }

    // Update last sync time
    localStorage.setItem(`lastSync_${scriptType}`, now.toString());

    // Fetch timestamps first
    await getScriptTimestamps(userID, scriptType);

    const querySnapshot = await getDocs(
      collection(db, "scripts", userID, scriptType)
    );
    if (querySnapshot.empty) {
      return [];
    }

    let scripts = [];
    querySnapshot.forEach((doc) => {
      let scriptObj = {
        id: doc.data().timestampString,
        name: doc.data().filename,
        content: doc.data().script,
        scriptType: scriptType,
        timestamp: doc.data().timestamp,
        timestampString: doc.data().timestampString,
      };
      scripts.push(scriptObj);
    });

    localStorage.setItem(scriptType, JSON.stringify(scripts));
    return scripts;
  } catch (e) {
    console.error("Error getting documents from scripts collection: ", e);
    return [];
  }
};

/**
 * Saves model preferences to Firestore.
 * @param {string} userID - The user's ID.
 * @param {Model} mainModel - The main model.
 * @param {Model} programmerModel - The programmer model.
 * @param {Model} imageGenerationModel - The image generation model.
 */
export const saveModelPreferencesToFirestore = async (userID, preferences) => {
  try {
    const querySnapshot = await getDocs(
      collection(db, "users", userID, "preferences")
    );
    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        updateDoc(doc.ref, {
          preferences: {
            ...preferences,
            tools: preferences.tools || DEFAULT_PREFERENCES.tools,
          },
          timestamp: Date.now(),
        });
      });
    } else {
      await addDoc(collection(db, "users", userID, "preferences"), {
        preferences: {
          ...preferences,
          tools: preferences.tools || DEFAULT_PREFERENCES.tools,
        },
        timestamp: Date.now(),
      });
    }
  } catch (e) {
    console.error("Error saving model preferences to Firestore: ", e);
  }
};

/**
 * Gets model preferences from Firestore.
 * @param {string} userID - The user's ID.
 * @returns {Promise<ModelPreferences>}
 */
export const getModelPreferencesFromFirestore = async (userID) => {
  try {
    const querySnapshot = await getDocs(
      collection(db, "users", userID, "preferences")
    );
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return doc.data().preferences ?? DEFAULT_PREFERENCES;
    }
    // Return default preferences for new users
    return DEFAULT_PREFERENCES;
  } catch (e) {
    console.error("Error getting model preferences from Firestore: ", e);
    // Return default preferences if there's an error
    return DEFAULT_PREFERENCES;
  }
};

export const getScriptTimestamps = async (userID, scriptType) => {
  try {
    const now = Date.now();
    const lastTimestampFetch = localStorage.getItem(
      `lastTimestampFetch_${scriptType}`
    );
    const FETCH_COOLDOWN = 5000; // 5 seconds cooldown

    if (
      lastTimestampFetch &&
      now - parseInt(lastTimestampFetch) < FETCH_COOLDOWN
    ) {
      // Return cached timestamps if available
      const cachedTimestamps = localStorage.getItem(`${scriptType}Timestamps`);
      return cachedTimestamps ? JSON.parse(cachedTimestamps) : {};
    }

    localStorage.setItem(`lastTimestampFetch_${scriptType}`, now.toString());

    const querySnapshot = await getDocs(
      collection(db, "scripts", userID, scriptType)
    );
    if (querySnapshot.empty) {
      return {};
    }

    const timestamps = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      timestamps[data.filename] = {
        timestamp: data.timestamp,
        timestampString: data.timestampString,
      };
    });

    // Save to localStorage
    localStorage.setItem(`${scriptType}Timestamps`, JSON.stringify(timestamps));

    if (mode === "development") {
      console.log(
        `Timestamps fetched and stored for ${scriptType}:`,
        timestamps
      );
    }

    return timestamps;
  } catch (e) {
    console.error("Error fetching script timestamps:", e);
    return {};
  }
};

// Add a utility function to get timestamps from localStorage
export const getLocalScriptTimestamps = (scriptType) => {
  try {
    const timestamps = localStorage.getItem(`${scriptType}Timestamps`);
    return timestamps ? JSON.parse(timestamps) : {};
  } catch (e) {
    console.error("Error getting script timestamps from localStorage:", e);
    return {};
  }
};

// Update the helper function to be exported
export const extractFirebaseImageUrls = (text) => {
  const regex =
    /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/images%2F[^?]+/g;
  const matches = text.match(regex);
  if (!matches) return [];

  return matches.map((url) => {
    // Convert the URL-encoded path back to a regular path
    const decodedUrl = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
    return decodedUrl;
  });
};

// Add this new function to delete a single image by its path
export const deleteImageFromFirebaseStorage = async (imagePath) => {
  try {
    const storage = getStorage(app);
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    if (mode === "development") {
      console.log("Image deleted successfully:", imagePath);
    }
    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
};

export const revertScriptToVersion = async (
  userID,
  scriptType,
  filename,
  versionNumber
) => {
  try {
    // Get all versions of the script
    const versions = await getVersionsOfScriptFromFirestore(
      userID,
      scriptType,
      filename
    );

    // Find the version we want to revert to
    const targetVersion = versions.find(
      (v) => v.versionNumber === versionNumber
    );
    if (!targetVersion) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    // Get the base filename (remove any existing version suffix)
    const baseFilename = filename.split("-v")[0];

    // First backup the current version
    await backupOldScriptMakeVersion(userID, scriptType, baseFilename);

    // Update the main script with the reverted version's content
    await updateFirestoreScript(
      userID,
      scriptType,
      baseFilename,
      targetVersion.script
    );

    if (mode === "development") {
      console.log(`Reverted ${baseFilename} to version ${versionNumber}`);
    }

    // Return the updated script content
    return targetVersion.script;
  } catch (e) {
    console.error("Error reverting script version:", e);
    throw e;
  }
};
