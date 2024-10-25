// docs: https://modularfirebase.web.app/common-use-cases/firestore/

import { firebaseConfig } from "../firebaseConfig";
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import {
  getFirestore, connectFirestoreEmulator, query,
  collection, addDoc, orderBy, updateDoc,
  limit, getDocs, writeBatch, deleteDoc, where
} from "firebase/firestore";

import { getStorage, ref, uploadBytes, deleteObject, getDownloadURL, listAll } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const auth = getAuth(app);

const mode = import.meta.env.MODE;

// if (mode === 'development') {
//   connectFirestoreEmulator(db, '[::1]', 8275);
// }


export const saveBalanceToFirestore = async (userID, balance) => {
  try {
    // find the user's balance document and update it
    const querySnapshot = await getDocs(collection(db, "users", userID, "balance"));
    let docRef;
    if (querySnapshot.empty) {
      docRef = await addDoc(collection(db, "users", userID, "balance"), {
        balance: balance,
        timestamp: new Date(),
        timestampString: new Date().toISOString()
      });
    } else {
      querySnapshot.forEach((doc) => {
        docRef = doc.ref;
        updateDoc(docRef, {
          balance: balance
        });
      });
    }
    if (mode === 'development') {
      console.log("Balance written to Firestore collection with ID: ", docRef.id);
    }
  } catch (e) {
    console.error("Error adding document to Firestore users collection: ", e);
  }
}


export const getBalanceFromFirestore = async (userID) => {
  try {
    const userDocs = await getDocs(collection(db, "users", userID, "balance"));
    // return False if user doesn't exist
    if (userDocs.empty) {
      return false;
    }
    const userDoc = userDocs.docs[0];
    const userObject = userDoc.data();
    let userBalance = userObject.balance;
    // only return if the balance exists
    if (userBalance) {
      return userBalance;
    }
  } catch (e) {
    console.error("Error getting document from Firestore users collection: ", e);
    return false;
  }
}


export const uploadImageToFirebaseStorageBucket = async (base64Image, userID) => {
  const storage = getStorage(app);
  // convert base64 to blob
  const byteCharacters = atob(base64Image.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const file = new Blob([byteArray], { type: 'image/jpeg' });
  // Create a storage reference from our storage service
  const storageRef = ref(storage, `images/${userID}/${Date.now()}.jpg`);
  const snapshot = await uploadBytes(storageRef, file);
  console.log('Uploaded a blob or file!');
  // return URI of the image
  return await getDownloadURL(snapshot.ref);
}

export const deleteAllUserImagesFromFirebaseStorageBucket = async (userID) => {
  const storage = getStorage(app);
  // get all files in the images/userID folder and delete them
  const storageRef = ref(storage, `images/${userID}`);
  const listRef = await listAll(storageRef);
  listRef.items.forEach(async (itemRef) => {
    await deleteObject(itemRef);
  });
  console.log('All user images deleted from Firebase Storage!');
}


export const saveUserToFirestore = async (userID, email, firstName, lastName) => {
  try {
    // check if user already exists in the database, delete all other documents with the same userID and save with this one
    const querySnapshot = await getDocs(collection(db, "users", userID, "account"));
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
      timestampString: new Date().toISOString()
    });
    if (mode === 'development') {
      console.log("User written to Firestore collection with ID: ", docRef.id);
    }
  } catch (e) {
    console.error("Error adding document to Firestore users collection: ", e);
  }
}


export const removeUserFromFirestore = async (userID) => {
  try {
    await deleteCollection(db, collection(db, "users", userID, "account"), 10);
    if (mode === 'development') {
      console.log("User removed from Firestore collection with ID: ", userID);
    }
    await removeUsersMemoryFromFirestore(userID);
  } catch (e) {
    console.error("Error removing document from Firestore users collection: ", e);
  }
}


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
    console.error("Error getting document from Firestore users collection: ", e);
  }
}


export const removeUsersMemoryFromFirestore = async (userID) => {
  try {
    await deleteCollection(db, collection(db, "memory", userID, "conversations"), 10);
    if (mode === 'development') {
      console.log("User's memory removed from Firestore collection with ID: ", userID);
    }
  } catch (e) {
    console.error("Error removing user's memory from Firestore memory collection: ", e);
  }
}


/**
 * Grabs prompts and responses from the database.
 * @returns 
 */
export const grabConversationHistory = async (userID) => {
  try {
    let history = [];
    // const querySnapshot = await getDocs(collection(db, "memory", userID, "conversations"));
    // re-write using the "where" clause to get the most recent 30 documents
    const q = query(collection(db, "memory", userID, "conversations"), orderBy('timestamp', 'desc'), limit(30));
    const querySnapshot = await getDocs(q);
    // check if the user has any history
    if (querySnapshot.empty) {
      return history;
    }
    querySnapshot.forEach((doc) => {
      let docData = doc.data();
      history.push(docData);
    });
    // sort the history by timestamp
    history.sort((a, b) => {
      return a.timestamp - b.timestamp;
    });
    // log the count of the history
    if (mode === 'development') {
      console.log("Fetched Conversation history count: ", history.length);
      // log historyCount in localStorage
      console.log("localStorage histCount: ", localStorage.getItem('histCount'));
    }
    return history;
  } catch (e) {
    console.error("Error getting documents: ", e);
    return [];
  }
}


/**
  * grabs conversation history total count from the database.
  * @returns 
  * */
export const grabConversationHistoryCount = async (userID) => {
  try {
    const querySnapshot = await getDocs(collection(db, "memory", userID, "conversations"));
    const count = querySnapshot.size;
    return count;
  } catch (e) {
    console.error("Error getting documents: ", e);
    return 0;
  }
}

/**
 * Gets status from database.
 */
export const grabStatus = async () => {
  return { status: "on" } // TODO: Implement this
}

/**
 * Gets mic status from database.
 */
export const grabMicStatus = async () => {
  return { status: "on" } // TODO: Implement this
}


/**
 * Delete a collection, in batches of batchSize. Note that this does
 * not recursively delete subcollections of documents in the collection
 */

function deleteCollection(db, collectionRef, batchSize) {
  const q = query(collectionRef, orderBy('__name__'), limit(batchSize));

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
    await deleteCollection(db, collection(db, "memory", userID, "conversations"), 10);
    localStorage.setItem('histCount', 0);
  } catch (e) {
    console.error("Error resetting memory collection: ", e);
  }
}


export const loadConversationHistoryFromFirestore = async (userID) => {
  try {
    const history = await grabConversationHistory(userID);
    if (history.length === 0) {
      return { prompts: [], responses: [], timestamps: [] };
    }
    const prompts = history.map(pair => pair.prompt);
    const responses = history.map(pair => pair.response);
    const timestamps = history.map(pair => pair.timestamp.toDate().getTime());
    return { prompts, responses, timestamps };
  } catch (e) {
    console.error(e);
    return { prompts: [], responses: [], timestamps: [] };
  }
}


// make optional skipBackup set to false
export const saveScriptToFirestore = async (userID, script, scriptType, filename, skipBackup = false) => {
  try {
    // check if the script is already in the database and just update the script
    const scriptExists = await isScriptInFirestore(userID, scriptType, filename);
    if (scriptExists) {
      if (!skipBackup) {
        await backupOldScriptMakeVersion(userID, scriptType, filename);
        if (mode === 'development') {
          let scriptVersions = await getVersionsOfScriptFromFirestore(userID, scriptType, filename);
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
      timestampString: new Date().toISOString()
    });
    if (mode === 'development') {
      console.log("Script written to Firestore collection with ID: ", docRef.id);
    }
  } catch (e) {
    console.error("Error adding document to Firestore scripts collection: ", e);
  }
}


export const backupOldScriptMakeVersion = async (userID, scriptType, filename) => {
  // backup the old script by adding -v1, -v2, -v3, etc. to the filename, keep track of which number version it is
  // this function will be called before updateScriptInFirestore to keep all previous versions of the script
  // simply check which version number is the highest and increment it by 1
  // create a new script document with the new filename and version number
  try {
    if (mode === 'development') {
      console.log("Backing up old script to Firestore collection with filename: ", filename);
    }
    const querySnapshot = await getDocs(collection(db, "scripts", userID, scriptType));
    if (querySnapshot.empty) {
      return;
    }
    let newVersionNumber = 1;
    // use the getVersionsOfScriptFromFirestore function to get all versions of the script
    let versions = await getVersionsOfScriptFromFirestore(userID, scriptType, filename);
    // check if versions is empty
    if (versions.length === 1) {
      newVersionNumber = 1;
    }
    else {
      // get the last version number
      let lastVersion = versions[versions.length - 1];
      newVersionNumber = String(Number(lastVersion.versionNumber) + 1);
    }
    let newFilename = `${filename}-v${newVersionNumber}`;

    const docRef = await addDoc(collection(db, "scripts", userID, scriptType), {
      script: versions[0].script,
      filename: newFilename,
      timestamp: new Date(),
      timestampString: new Date().toISOString()
    });
    if (mode === 'development') {
      console.log("Old script backed up to Firestore collection with ID: ", docRef.id);
    }
  } catch (e) {
    console.error("Error backing up old script to Firestore scripts collection: ", e);
  }
}


export const getVersionsOfScriptFromFirestore = async (userID, scriptType, filename) => {
  try {
    if (mode === 'development') {
      console.log("Getting versions of script from Firestore collection with filename: ", filename);
    }
    const querySnapshot = await getDocs(collection(db, "scripts", userID, scriptType));
    if (querySnapshot.empty) {
      return [];
    }
    let versions = [];
    querySnapshot.forEach((doc) => {
      // remove all spaces from the filename
      let docfileName = doc.data().filename.replace(/\s/g, '');
      // remove all spaces from the filename
      filename = filename.replace(/\s/g, '');
      if (docfileName.includes(filename)) {
        let versionNumber = 0;
        if (doc.data().filename.includes('-v')) {
          versionNumber = doc.data().filename.split('-v')[1];
          let version = { versionNumber: versionNumber, script: doc.data().script };
          versions.push(version);
        } else {
          let version = { versionNumber: 0, script: doc.data().script, timestamp: doc.data().timestamp };
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
  }
  catch (e) {
    console.error("Error getting document in Firestore scripts collection: ", e);
    return [];
  }
}


export const updateFirestoreScript = async (userID, scriptType, filename, script) => {
  // find the script with the filename and update it
  try {
    const querySnapshot = await getDocs(collection(db, "scripts", userID, scriptType));
    if (querySnapshot.empty) {
      return;
    }
    querySnapshot.forEach((doc) => {
      let docDataFilename = doc.data().filename;
      // strip the filename of any spaces
      docDataFilename = docDataFilename.replace(/\s/g, '');
      // strip filename of any spaces
      filename = filename.replace(/\s/g, '');
      if (docDataFilename === filename) {
        const docRef = doc.ref;
        updateDoc(docRef, {
          script: script
        });
      }
    }
    );
  } catch (e) {
    console.error("Error updating document in Firestore scripts collection: ", e);
  }
}


export const isScriptInFirestore = async (userID, scriptType, filename) => {
  try {
    if (mode === 'development') {
      console.log("Checking if script is in Firestore collection with filename: ", filename);
    }
    const querySnapshot = await getDocs(collection(db, "scripts", userID, scriptType));
    if (querySnapshot.empty) {
      return false;
    }
    let found = false;
    querySnapshot.forEach((doc) => {
      let docDataFilename = doc.data().filename;
      // strip the filename of any spaces
      docDataFilename = docDataFilename.replace(/\s/g, '');
      // strip filename of any spaces
      filename = filename.replace(/\s/g, '');
      if (docDataFilename === filename) {
        found = true;
      }
    });
    if (mode === 'development') {
      console.log("Script found in Firestore: ", found);
    }
    return found;
  } catch (e) {
    console.error("Error checking if document is in Firestore scripts collection: ", e);
    return false;
  }
}


export const renameScriptInFirestore = async (userID, scriptId, scriptType, oldFilename, newFilename) => {
  try {
    if (mode === 'development') {
      console.log("Renaming script in Firestore collection with filename: ", oldFilename
      );
    }
    const querySnapshot = await getDocs(collection(db, "scripts", userID, scriptType));
    if (querySnapshot.empty) {
      return;
    }
    querySnapshot.forEach((doc) => {
      if (doc.data().timestampString === scriptId) {
        const docRef = doc.ref;
        updateDoc(docRef, {
          filename: newFilename
        });
      }
    });
  } catch (e) {
    console.error("Error renaming document in Firestore scripts collection: ", e);
  }
}



export const deleteScriptFromFirestore = async (userID, scriptType, filename) => {
  try {
    if (mode === 'development') {
      console.log("Deleting script from Firestore collection with filename: ", filename
      );
    }
    const querySnapshot = await getDocs(collection(db, "scripts", userID, scriptType));
    if (querySnapshot.empty) {
      return;
    }
    querySnapshot.forEach((doc) => {
      if (doc.data().filename === filename) {
        deleteDoc(doc.ref);
      }
    });
  } catch (e) {
    console.error("Error deleting document from Firestore scripts collection: ", e);
  }
}


export const deleteAllUserScriptsFromFirestore = async (userID) => {
  try {
    await deleteCollection(db, collection(db, "scripts", userID, "webApps"), 10);
    await deleteCollection(db, collection(db, "scripts", userID, "openSCAD"), 10);
    if (mode === 'development') {
      console.log("All user scripts removed from Firestore collection with ID: ", userID);
    }
  } catch (e) {
    console.error("Error removing user's scripts from Firestore scripts collection: ", e);
  }
}


export const syncLocalScriptsWithFirestore = async (userID, scriptType) => {
  try {
    if (mode === 'development') {
      console.log("Syncing local storage with Firestore for scripts of type: ", scriptType);
    }
    const querySnapshot = await getDocs(collection(db, "scripts", userID, scriptType));
    if (querySnapshot.empty) {
      return [];
    }
    // [{ id: Date.now(), name: filename, content: cleanedScript }, ] is what scriptType in localstorage looks like
    let scripts = [];
    querySnapshot.forEach((doc) => {
      let scriptObj = { id: doc.data().timestampString, name: doc.data().filename, content: doc.data().script, scriptType: scriptType, timestamp: doc.data().timestamp };
      scripts.push(scriptObj);
    });
    localStorage.setItem(scriptType, JSON.stringify(scripts));
    // let localScripts = JSON.parse(localStorage.getItem(scriptType));
    // if (mode === 'development') {
    //   console.log("Local scripts after syncing with Firestore: ", localScripts);
    // }
  } catch (e) {
    console.error("Error getting documents from scripts collection: ", e);
    return [];
  }
}


export const uploadGeneratedImageToFirebaseStorage = async (imageURL, userID) => {
  // first, fetch the image from the imageURL to get the blob
  // console.log("fetching image from URL: ", imageURL);
  // // const response = await fetch(imageURL);
  // // fetch with no-cors mode
  // const response = await fetch(imageURL, {
  //   mode: 'no-cors'
  // });
  // console.log("Getting blob from response...");
  // const blob = await response.blob();
  // console.log("Uploading image to Firebase Storage...");
  // const storage = getStorage(app);
  // console.log("Creating storage reference...");
  // // Create a storage reference from our storage service
  // const storageRef = ref(storage, `images/${userID}/${Date.now()}.jpg`);
  // console.log("Uploading bytes...");
  // const file = new Blob([blob], { type: 'image/jpeg' });
  // const snapshot = await uploadBytes(storageRef, file);
  // console.log('Uploaded a blob or file!');
  // // return URI of the image
  // return await getDownloadURL(snapshot.ref);
}
