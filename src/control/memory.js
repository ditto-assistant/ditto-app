import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";

import {
  db,
  grabConversationHistory,
  extractFirebaseImageUrls,
  deleteImageFromFirebaseStorage,
} from "./firebase";
import { routes } from "../firebaseConfig";
import { auth } from "./firebase";

/**
 * Grab 5 most recent prompts and responses from the database.
 */
export const getShortTermMemory = async (userID, k) => {
  try {
    const history = [];
    // Error adding document to Firestore memory collection:  FirebaseError: Invalid collection reference. Collection references must have an odd number of segments, but memory has 2
    // const querySnapshot = await getDocs(collection(db, "memory", userID, "conversations"));
    // re-write using the "where" clause to get the most recent 5 documents
    const q = query(
      collection(db, "memory", userID, "conversations"),
      orderBy("timestamp", "desc"),
      limit(k)
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      history.push(doc.data());
    });
    // check if deactivateLongTermMemory exists in localStorage
    let isDeactivated =
      localStorage.getItem("deactivateShortTermMemory") || "false";
    if (history.length === 0 || isDeactivated == "true") {
      // if (history.length === 0) {
      return "No history! :)";
    }
    // sort and grab the most recent 5 by timestamp
    history.sort((a, b) => a.timestamp - b.timestamp);
    // const recentHistory = history.slice(-k);
    // get timestamp as a string YYYY-MM-DD HH:MM:SS
    const shortTermMemory = history.map((pair) => {
      // check if "Script Generated and Downloaded.]\nTask:" is in the response
      // split by that substring and check if [0] has webApps or openSCAD
      // if webApps, change the response to <HTML_SCRIPT> [-1] of the split response
      // if openSCAD, change the response to <OPENSCAD> [-1] od the split response
      if (pair.response.includes("Script Generated and Downloaded.**")) {
        const splitResponse = pair.response.split("- Task:");
        if (splitResponse[0].includes("HTML")) {
          return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <HTML_SCRIPT>${splitResponse[1]}\n`;
        } else if (splitResponse[0].includes("OpenSCAD")) {
          return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <OPENSCAD>${splitResponse[1]}\n`;
        }
      } else if (pair.response.includes("Image Task:")) {
        const splitResponse = pair.response.split("Image Task:");
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <IMAGE_GENERATION>${splitResponse[1]}\n`;
      } else if (pair.response.includes("Google Search Query:")) {
        const splitResponse = pair.response.split("Google Search Query:");
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <GOOGLE_SEARCH>${splitResponse[1]}\n`;
      } else if (pair.response.includes("Home Assistant Task:")) {
        const splitResponse = pair.response.split("Home Assistant Task:");
        const cleanedResponse = splitResponse[1]
          .replace(/Task completed successfully\.|Task failed\./, "")
          .trim();
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <GOOGLE_HOME> ${cleanedResponse}\n`;
      } else {
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: ${pair.response}\n`;
      }
    });
    // remove the last newline character from the last element by joining the array and removing the last character or newline
    return shortTermMemory.join("").slice(0, -1);
  } catch (e) {
    console.error(
      "Error getting short term memory (5) documents from memory collection: ",
      e
    );
    return "No history! :)";
  }
};

export const getLongTermMemory = async (userID, embedding, k) => {
  try {
    console.log("getLongTermMemory - Starting function");
    let isDeactivated =
      localStorage.getItem("deactivateLongTermMemory") || "false";
    console.log("Long term memory deactivated:", isDeactivated);

    if (isDeactivated === "true") {
      return "No history! :)";
    }

    const user = auth.currentUser;
    console.log("Current user exists:", !!user);

    if (!user) {
      throw new Error("No authenticated user found");
    }

    const token = await user.getIdToken();

    // Modified fetch request
    const response = await fetch(routes.memories, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        Origin: window.location.origin,
      },
      mode: "cors",
      credentials: "same-origin",
      body: JSON.stringify({
        userId: userID,
        vector: embedding,
        k: k,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error response:", errorData);
      throw new Error(
        errorData.details || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.memories || data.memories.length === 0) {
      return "No history! :)";
    }

    console.log("Processing memories for formatting");
    const longTermMemory = data.memories
      .map((pair) => {
        if (!pair || !pair.response) {
          console.log("Skipping invalid memory entry");
          return "";
        }

        // Log the type of response we're processing
        // console.log("Processing response type:",
        //   pair.response.includes("Script Generated") ? "Script" :
        //   pair.response.includes("Image Task") ? "Image" :
        //   pair.response.includes("Google Search") ? "Search" :
        //   pair.response.includes("Home Assistant") ? "Home" :
        //   "Normal"
        // );

        // Rest of the formatting logic remains the same
        if (pair.response.includes("Script Generated and Downloaded.**")) {
          const splitResponse = pair.response.split("- Task:");
          if (splitResponse[0].includes("HTML")) {
            return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <HTML_SCRIPT>${splitResponse[1]}\n`;
          } else if (splitResponse[0].includes("OpenSCAD")) {
            return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <OPENSCAD>${splitResponse[1]}\n`;
          }
        } else if (pair.response.includes("Image Task:")) {
          const splitResponse = pair.response.split("Image Task:");
          return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <IMAGE_GENERATION>${splitResponse[1]}\n`;
        } else if (pair.response.includes("Google Search Query:")) {
          const splitResponse = pair.response.split("Google Search Query:");
          return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <GOOGLE_SEARCH>${splitResponse[1]}\n`;
        } else if (pair.response.includes("Home Assistant Task:")) {
          const splitResponse = pair.response.split("Home Assistant Task:");
          const cleanedResponse = splitResponse[1].replace(
            /Task (completed successfully|failed)\.$/,
            ""
          );
          return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <GOOGLE_HOME> ${cleanedResponse}\n`;
        } else {
          return `User (${pair.timestampString}): ${pair.prompt}\nDitto: ${pair.response}\n`;
        }
      })
      .filter(Boolean);

    return longTermMemory.join("").slice(0, -1) || "No history! :)";
  } catch (e) {
    console.error("Error getting long term memory:", e);
    console.error("Stack trace:", e.stack);
    return "No history! :)";
  }
};

/**
 * Get the embedding array for a specific conversation document
 * @param {string} userID - The user's ID
 * @param {string} docId - The document ID of the conversation
 * @returns {number[]|null} - Returns the embedding array if found, null otherwise
 */
export const getConversationEmbedding = async (userID, docId) => {
  try {
    const querySnapshot = await getDocs(
      collection(db, "memory", userID, "conversations")
    );

    let embedding = null;
    querySnapshot.forEach((doc) => {
      if (doc.id === docId) {
        embedding = doc.data().embedding;
      }
    });

    return embedding;
  } catch (e) {
    console.error("Error getting conversation embedding:", e);
    return null;
  }
};

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
          deleteImageFromFirebaseStorage(imagePath)
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
