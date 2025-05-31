// docs: https://modularfirebase.web.app/common-use-cases/firestore/

import { firebaseConfig } from "@/firebaseConfig"
import { initializeApp } from "firebase/app"
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
} from "firebase/firestore"
import {
  getStorage,
  ref,
  uploadBytes,
  deleteObject,
  getDownloadURL,
  listAll,
} from "firebase/storage"
import { getAuth } from "firebase/auth"

// Initialize Firebase
export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

const mode = import.meta.env.MODE

export const uploadImageToFirebaseStorageBucket = async (
  base64Image,
  userID
) => {
  const storage = getStorage(app)
  // convert base64 to blob
  const byteCharacters = atob(base64Image.split(",")[1])
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const file = new Blob([byteArray], { type: "image/jpeg" })
  // Create a storage reference from our storage service
  const storageRef = ref(storage, `images/${userID}/${Date.now()}.jpg`)
  const snapshot = await uploadBytes(storageRef, file)
  console.log("Uploaded a blob or file!")
  // return URI of the image
  return await getDownloadURL(snapshot.ref)
}

export const deleteAllUserImagesFromFirebaseStorageBucket = async (userID) => {
  const storage = getStorage(app)
  // get all files in the images/userID folder and delete them
  const storageRef = ref(storage, `images/${userID}`)
  const listRef = await listAll(storageRef)
  listRef.items.forEach(async (itemRef) => {
    await deleteObject(itemRef)
  })
  console.log("All user images deleted from Firebase Storage!")
}

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
    )
    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        deleteDoc(doc.ref)
      })
    }
    const docRef = await addDoc(collection(db, "users", userID, "account"), {
      userID: userID,
      email: email,
      firstName: firstName,
      lastName: lastName,
      timestamp: new Date(),
    })
    if (mode === "development") {
      console.log("User written to Firestore collection with ID: ", docRef.id)
    }
  } catch (e) {
    console.error("Error adding document to Firestore users collection: ", e)
  }
}

export const removeUserFromFirestore = async (userID) => {
  try {
    // First delete all user's images
    await deleteAllUserImagesFromFirebaseStorageBucket(userID)

    // Then delete user's account data
    await deleteCollection(db, collection(db, "users", userID, "account"), 10)
    if (mode === "development") {
      console.log("User removed from Firestore collection with ID: ", userID)
    }
    await removeUsersMemoryFromFirestore(userID)
  } catch (e) {
    console.error(
      "Error removing document from Firestore users collection: ",
      e
    )
  }
}

export const getUserObjectFromFirestore = async (userID) => {
  try {
    const userDocs = await getDocs(collection(db, "users", userID, "account"))
    // return False if user doesn't exist
    if (userDocs.empty) {
      return false
    }
    const userDoc = userDocs.docs[0]
    const userObject = userDoc.data()
    return userObject
  } catch (e) {
    console.error("Error getting document from Firestore users collection: ", e)
  }
}

export const removeUsersMemoryFromFirestore = async (userID) => {
  try {
    // Get all conversations first to check for images
    const conversationsRef = collection(db, "memory", userID, "conversations")
    const querySnapshot = await getDocs(conversationsRef)

    // Extract and delete all images found in prompts
    const deleteImagePromises = []
    querySnapshot.forEach((doc) => {
      const data = doc.data()
      if (data.prompt) {
        const imageUrls = extractFirebaseImageUrls(data.prompt)
        imageUrls.forEach((imagePath) => {
          deleteImagePromises.push(deleteImageFromFirebaseStorage(imagePath))
        })
      }
    })

    // Wait for all image deletions to complete
    if (deleteImagePromises.length > 0) {
      await Promise.all(deleteImagePromises)
    }

    // Then delete the conversations collection
    await deleteCollection(db, conversationsRef, 10)

    if (mode === "development") {
      console.log(
        "User's memory and associated images removed for ID: ",
        userID
      )
    }

    // Dispatch event when memories are deleted
    window.dispatchEvent(new Event("memoryUpdated"))
  } catch (e) {
    console.error(
      "Error removing user's memory from Firestore memory collection: ",
      e
    )
  }
}

/**
 * grabs conversation history total count from the database.
 * @returns
 * */
export const grabConversationHistoryCount = async (userID) => {
  try {
    const conversationsRef = collection(db, "memory", userID, "conversations")
    const snapshot = await getCountFromServer(conversationsRef)
    return snapshot.data().count
  } catch (e) {
    console.error("Error getting conversation count: ", e)
    return 0
  }
}

/**
 * Delete a collection, in batches of batchSize. Note that this does
 * not recursively delete subcollections of documents in the collection
 */

function deleteCollection(db, collectionRef, batchSize) {
  const q = query(collectionRef, orderBy("__name__"), limit(batchSize))

  return new Promise((resolve) => {
    deleteQueryBatch(db, q, batchSize, resolve)
  })
}

async function deleteQueryBatch(db, query, batchSize, resolve) {
  const snapshot = await getDocs(query)

  // When there are no documents left, we are done
  let numDeleted = 0
  if (snapshot.size > 0) {
    // Delete documents in a batch
    const batch = writeBatch(db)
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()
    numDeleted = snapshot.size
  }

  if (numDeleted < batchSize) {
    resolve()
    return
  }

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  setTimeout(() => {
    deleteQueryBatch(db, query, batchSize, resolve)
  }, 0)
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
    )
    localStorage.setItem("histCount", 0)
    // Dispatch event when conversation is reset
    window.dispatchEvent(new Event("memoryUpdated"))
  } catch (e) {
    console.error("Error resetting memory collection: ", e)
  }
}

// Update the helper function to be exported
export const extractFirebaseImageUrls = (text) => {
  const regex =
    /https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/images%2F[^?]+/g
  const matches = text.match(regex)
  if (!matches) return []

  return matches.map((url) => {
    // Convert the URL-encoded path back to a regular path
    const decodedUrl = decodeURIComponent(url.split("/o/")[1].split("?")[0])
    return decodedUrl
  })
}

// Add this new function to delete a single image by its path
export const deleteImageFromFirebaseStorage = async (imagePath) => {
  try {
    const storage = getStorage(app)
    const imageRef = ref(storage, imagePath)
    await deleteObject(imageRef)
    if (mode === "development") {
      console.log("Image deleted successfully:", imagePath)
    }
    return true
  } catch (error) {
    console.error("Error deleting image:", error)
    return false
  }
}

/**
 * Saves the user's prompt to Firestore.
 * @param {string} userID - The user's ID.
 * @param {string} prompt - The prompt text to save.
 * @param {string} [image] - Optional base64 encoded image.
 */
export const savePromptToFirestore = async (userID, prompt, image = "") => {
  try {
    const querySnapshot = await getDocs(
      collection(db, "users", userID, "drafts")
    )

    if (!querySnapshot.empty) {
      // Update existing draft
      querySnapshot.forEach((doc) => {
        updateDoc(doc.ref, {
          prompt: prompt,
          image: image,
          timestamp: new Date(),
        })
      })
    } else {
      // Create new draft
      await addDoc(collection(db, "users", userID, "drafts"), {
        prompt: prompt,
        image: image,
        timestamp: new Date(),
      })
    }

    if (mode === "development") {
      console.log("User prompt saved to Firestore")
    }
  } catch (e) {
    console.error("Error saving prompt to Firestore: ", e)
  }
}

/**
 * Gets the user's saved prompt from Firestore.
 * @param {string} userID - The user's ID.
 * @returns {Promise<{prompt: string, image: string} | null>}
 */
export const getPromptFromFirestore = async (userID) => {
  try {
    const querySnapshot = await getDocs(
      collection(db, "users", userID, "drafts")
    )

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      const data = doc.data()
      return {
        prompt: data.prompt || "",
        image: data.image || "",
      }
    }

    return null
  } catch (e) {
    console.error("Error getting prompt from Firestore: ", e)
    return null
  }
}

/**
 * Clears the user's saved prompt from Firestore.
 * @param {string} userID - The user's ID.
 */
export const clearPromptFromFirestore = async (userID) => {
  try {
    const querySnapshot = await getDocs(
      collection(db, "users", userID, "drafts")
    )

    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        deleteDoc(doc.ref)
      })
    }

    if (mode === "development") {
      console.log("User prompt cleared from Firestore")
    }
  } catch (e) {
    console.error("Error clearing prompt from Firestore: ", e)
  }
}
