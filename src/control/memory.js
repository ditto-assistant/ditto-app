import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "firebase/firestore";

import { db, grabConversationHistory } from "./firebase";
import { routes } from '../firebaseConfig';
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
    const q = query(collection(db, "memory", userID, "conversations"), orderBy('timestamp', 'desc'), limit(k));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      history.push(doc.data());
    });
    // check if deactivateLongTermMemory exists in localStorage
    let isDeactivated = localStorage.getItem("deactivateShortTermMemory") || "false";
    if (history.length === 0 || isDeactivated == "true") {
      // if (history.length === 0) {
      return "No history! :)";
    }
    // sort and grab the most recent 5 by timestamp
    history.sort((a, b) => a.timestamp - b.timestamp);
    // const recentHistory = history.slice(-k);
    // get timestamp as a string YYYY-MM-DD HH:MM:SS
    const shortTermMemory = history.map(pair => {
      // check if "Script Generated and Downloaded.]\nTask:" is in the response
      // split by that substring and check if [0] has webApps or openSCAD
      // if webApps, change the response to <HTML_SCRIPT> [-1] of the split response
      // if openSCAD, change the response to <OPENSCAD> [-1] od the split response
      if (pair.response.includes("Script Generated and Downloaded.**")) {
        const splitResponse = pair.response.split("- Task:");
        if (splitResponse[0].includes("HTML")) {
          return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <HTML_SCRIPT>${splitResponse[1]}\n`;
        }
        else if (splitResponse[0].includes("OpenSCAD")) {
          return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <OPENSCAD>${splitResponse[1]}\n`;
        }
      }
      else if (pair.response.includes("Image Task:")) {
        const splitResponse = pair.response.split("Image Task:");
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <IMAGE_GENERATION>${splitResponse[1]}\n`;
      }
      else if (pair.response.includes("Google Search Query:")) {
        const splitResponse = pair.response.split("Google Search Query:");
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <GOOGLE_SEARCH>${splitResponse[1]}\n`;
      } else if (pair.response.includes("Home Assistant Task:")) {
        const splitResponse = pair.response.split("Home Assistant Task:");
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <GOOGLE_HOME>${splitResponse[1]}\n`;
      }
      else {
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: ${pair.response}\n`;
      }
    });
    // remove the last newline character from the last element by joining the array and removing the last character or newline
    return shortTermMemory.join('').slice(0, -1);
  } catch (e) {
    console.error("Error getting short term memory (5) documents from memory collection: ", e);
    return "No history! :)";
  }
}

export const getLongTermMemory = async (userID, embedding, k) => {
  try {
    console.log("getLongTermMemory - Starting function");
    let isDeactivated = localStorage.getItem("deactivateLongTermMemory") || "false";
    console.log("Long term memory deactivated:", isDeactivated);
    
    if (isDeactivated === "true") {
      return "No history! :)";
    }

    // Get the Firebase auth token
    const user = auth.currentUser;
    console.log("Current user exists:", !!user);
    
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const token = await user.getIdToken();

    const response = await fetch(routes.memories, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        userId: userID,
        vector: embedding,
        k: k
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error response:", errorData);
      throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.memories || data.memories.length === 0) {
      return "No history! :)";
    }

    console.log("Processing memories for formatting");
    const longTermMemory = data.memories.map(pair => {
      if (!pair || !pair.response) {
        console.log("Skipping invalid memory entry");
        return '';
      }

      // Log the type of response we're processing
      console.log("Processing response type:", 
        pair.response.includes("Script Generated") ? "Script" :
        pair.response.includes("Image Task") ? "Image" :
        pair.response.includes("Google Search") ? "Search" :
        pair.response.includes("Home Assistant") ? "Home" :
        "Normal"
      );

      // Rest of the formatting logic remains the same
      if (pair.response.includes("Script Generated and Downloaded.**")) {
        const splitResponse = pair.response.split("- Task:");
        if (splitResponse[0].includes("HTML")) {
          return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <HTML_SCRIPT>${splitResponse[1]}\n`;
        }
        else if (splitResponse[0].includes("OpenSCAD")) {
          return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <OPENSCAD>${splitResponse[1]}\n`;
        }
      }
      else if (pair.response.includes("Image Task:")) {
        const splitResponse = pair.response.split("Image Task:");
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <IMAGE_GENERATION>${splitResponse[1]}\n`;
      }
      else if (pair.response.includes("Google Search Query:")) {
        const splitResponse = pair.response.split("Google Search Query:");
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <GOOGLE_SEARCH>${splitResponse[1]}\n`;
      } 
      else if (pair.response.includes("Home Assistant Task:")) {
        const splitResponse = pair.response.split("Home Assistant Task:");
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: <GOOGLE_HOME>${splitResponse[1]}\n`;
      }
      else {
        return `User (${pair.timestampString}): ${pair.prompt}\nDitto: ${pair.response}\n`;
      }
    }).filter(Boolean);

    return longTermMemory.join('').slice(0, -1) || "No history! :)";
  }
  catch (e) {
    console.error('Error getting long term memory:', e);
    console.error('Stack trace:', e.stack);
    return "No history! :)";
  }
}
