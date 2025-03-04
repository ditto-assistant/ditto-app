import { deleteDoc, doc, getDoc } from "firebase/firestore";
import {
  db,
  extractFirebaseImageUrls,
  deleteImageFromFirebaseStorage,
} from "./firebase";

/**
 * Delete a conversation from Firestore by its document ID
 * @param {string} userID - The user's ID
 * @param {string} docId - The document ID of the conversation to delete
 * @returns {boolean} - Returns true if deletion was successful
 */
export const deleteConversation = async (userID, docId) => {
  try {
    // First get the document to check for images
    const docRef = doc(db, "memory", userID, "conversations", docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Check prompt for Firebase Storage URLs
      if (data.prompt) {
        const imageUrls = extractFirebaseImageUrls(data.prompt);

        // Delete any found images
        const deletePromises = imageUrls.map((imagePath) =>
          deleteImageFromFirebaseStorage(imagePath),
        );

        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }
      }

      // Delete the conversation document
      await deleteDoc(docRef);
      return true;
    }

    return false;
  } catch (e) {
    console.error("Error deleting conversation:", e);
    return false;
  }
};
