import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "firebase/firestore";

import { db, grabConversationHistory } from "./firebase";

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
    let isDeactivated = localStorage.getItem("deactivateShortTermMemory");
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

export const cosineSimilarity = (a, b) => {
  const dot = (a, b) => a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
  const mag = (vec) => Math.sqrt(dot(vec, vec));
  return dot(a, b) / (mag(a) * mag(b));
}

export const getLongTermMemory = async (userID, embedding, k) => {
  try {
    console.log("Getting long term memory...");
    const history = await grabConversationHistory(userID);
    let isDeactivated = localStorage.getItem("deactivateLongTermMemory");
    if (history.length === 0 || isDeactivated == "true") {
      // if (history.length === 0) {
      return "No history! :)";
    }
    const scores = [];
    history.forEach(pair => {
      const pairEmbedding = pair.embedding;
      // console.log("pairEmbedding: ", pairEmbedding);
      // if pair.response == 'You have no API key or your balance is too low.' then skip and make similarityScore = 0
      if (pairEmbedding.response == 'You have no API key or your balance is too low.') {
        const similarityScore = 0;
        scores.push({ pair: pair, score: similarityScore });
      } else {
        const similarityScore = cosineSimilarity(embedding, pairEmbedding);
        scores.push({ pair: pair, score: similarityScore });
      }
    }
    );
    scores.sort((a, b) => b.score - a.score);
    const relevantPairs = scores.slice(0, k);
    // make prompt/response pairs into a string for the prompt template
    // user (timestamp): "prompt here"
    // ditto: "response here"
    const longTermMemory = relevantPairs.map(pair => {

      // check if "Script Generated and Downloaded.]\nTask:" is in the response
      // split by that substring and check if [0] has webApps or openSCAD
      // if webApps, change the response to <HTML_SCRIPT> [-1] of the split response
      // if openSCAD, change the response to <OPENSCAD> [-1] od the split response
      // console.log(pair.pair.response);
      if (pair.pair.response.includes("Script Generated and Downloaded.**")) {
        const splitResponse = pair.pair.response.split("- Task:");
        if (splitResponse[0].includes("HTML")) {
          return `User (${pair.pair.timestampString}): ${pair.pair.prompt}\nDitto: <HTML_SCRIPT>${splitResponse[1]}\n`;
        }
        else if (splitResponse[0].includes("OpenSCAD")) {
          return `User (${pair.pair.timestampString}): ${pair.pair.prompt}\nDitto: <OPENSCAD>${splitResponse[1]}\n`;
        }
      }
      else if (pair.pair.response.includes("Image Task:")) {
        const splitResponse = pair.pair.response.split("Image Task:");
        return `User (${pair.pair.timestampString}): ${pair.pair.prompt}\nDitto: <IMAGE_GENERATION>${splitResponse[1]}\n`;

      }
      else if (pair.pair.response.includes("Google Search Query:")) {
        const splitResponse = pair.pair.response.split("Google Search Query:");
        return `User (${pair.pair.timestampString}): ${pair.pair.prompt}\nDitto: <GOOGLE_SEARCH>${splitResponse[1]}\n`;
      } else if (pair.pair.response.includes("Home Assistant Task:")) {
        const splitResponse = pair.pair.response.split("Home Assistant Task:");
        return `User (${pair.pair.timestampString}): ${pair.pair.prompt}\nDitto: <GOOGLE_HOME>${splitResponse[1]}\n`;
      }
      else {
        return `User (${pair.pair.timestampString}): ${pair.pair.prompt}\nDitto: ${pair.pair.response}\n`;
      }
    });
    return longTermMemory.join('').slice(0, -1);
  }
  catch (e) {
    console.error(e);
    return "No history! :)";
  }
}