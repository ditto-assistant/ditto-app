/**
 * API functions to interact with Ditto.
 * 
 */

// const ip = 'localhost'
import { config } from "./config"
const ip = config.ip;

/**
 * Function for interacting with Ditto's database.
 */
export const sendRequest = async (fetchMethod, APIRequest, params = {}, timeout = 1000) => {
  // setup timeout 
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)
  const isEmpty = Object.keys(params).length === 0;
  if (isEmpty) {
    try {
      const fetchLink = `http://${ip}:42032/${APIRequest}`
      console.log('[API Request] ' + fetchLink)
      const fetchResponse = await fetch(fetchLink, {
        method: fetchMethod,
        signal: controller.signal
      });
      clearTimeout(id);
      const responseJson = await fetchResponse.json();
      return responseJson;
    } catch (e) {
      console.log(e);
      return undefined;
    }
  } else {
    var parameters;
    parameters = Object.keys(params);
    const key = parameters[0];
    try {
      const fetchLink = `http://${ip}:42032/${APIRequest}/?${parameters[0]}=${params[key]}`;
      console.log('[API Request] ' + fetchLink);
      const fetchResponse = await fetch(fetchLink, {
        method: fetchMethod,
        signal: controller.signal
      });
      clearTimeout(id);
      const responseJson = await fetchResponse.json(); // Promise (use await)
      return responseJson;
    } catch (e) {
      console.log(e);
      return undefined;
    }
  }
}

/**
 * Grabs prompts and responses from the Ditto SQLite3 database.
 * @returns 
 */
export const grabConversationHistory = async () => {
  // console.log('grabbing conversation hist from server')
  try {
    var history = await sendRequest('GET', 'ditto', { "history": "1" });
    return history;
  } catch (e) {
    console.error(e);
  }
}

/**
 * Gets conversation history count from database.
 * @returns Number: count representing prompts + responses
 */
export const grabConversationHistoryCount = async () => {
  // console.log('grabbing conversation historyCount from server')
  try {
    var count = await sendRequest('GET', 'ditto', { "historyCount": 1 })
    if (count !== undefined) { return count.historyCount };
  } catch (e) {
    console.error(e)
    return undefined
  }
}

/**
 * Gets status from database.
 */
export const grabStatus = async () => {
  // console.log('grabbing conversation historyCount from server')
  try {
    var statusDB = await sendRequest('GET', 'ditto', { "status": 1 })
    if (statusDB === undefined) {
      return { status: "off" }
    } else {
      return statusDB;
    }
  } catch (e) {
    console.error(e)
    return { status: "off" }
  }
}

/**
 * Gets mic status from database.
 */
export const grabMicStatus = async () => {
  // console.log('grabbing conversation historyCount from server')
  try {
    var statusDB = await sendRequest('GET', 'ditto', { "dittoMicStatus": 1 })
    if (statusDB === undefined) {
      return { status: "off" }
    } else {
      return statusDB;
    }
  } catch (e) {
    console.error(e)
    return { status: "off" }
  }
}

/**
 * Resets conversation history.
 */
export const resetConversation = async () => {
  try {
    await sendRequest('POST', 'ditto', { "resetConversation": 1 })
  } catch (e) {
    console.error(e)
  }
}

/**
 * Resets conversation history.
 */
export const toggleMic = async () => {
  try {
    await sendRequest('POST', 'ditto', { "toggleMic": 1 })
  } catch (e) {
    console.error(e)
  }
}


/**
 * Send a prompt to Ditto.
 */
export const sendPrompt = async (prompt) => {
  try {
    await sendRequest('POST', 'ditto', { "prompt": `${prompt}` })
  } catch (e) {
    console.error(e)
  }
}