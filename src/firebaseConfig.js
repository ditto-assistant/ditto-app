// Your web app's Firebase configuration
// const MODE = import.meta.env.MODE;
const MODE = "production";

function getBaseURL(dittoEnv) {
  switch (dittoEnv) {
    case "development":
      return "http://localhost:3400";
    case "production":
      return "https://backend-22790208601.us-central1.run.app";
    case "staging":
      return "https://staging-backend-22790208601.us-central1.run.app";
    default:
      return "https://backend-22790208601.us-central1.run.app";
  }
}

export const BASE_URL = getBaseURL(MODE);

function getMemoriesURL(dittoEnv) {
  switch (dittoEnv) {
    // case "development":
    // return "http://127.0.0.1:5001/ditto-app-dev/us-central1/api/get-memories";
    default:
      return "https://us-central1-ditto-app-dev.cloudfunctions.net/api/get-memories";
    // return "http://127.0.0.1:5001/ditto-app-dev/us-central1/api/get-memories";
  }
}

export const routes = {
  prompt: BASE_URL + "/v1/prompt",
  embed: BASE_URL + "/v1/embed",
  search: BASE_URL + "/v1/google-search",
  imageGeneration: BASE_URL + "/v1/generate-image",
  searchExamples: BASE_URL + "/v1/search-examples",
  /**
   * Generates the URL for retrieving the user's balance.
   * 
   * @param {string} userID - The unique identifier of the user.
   * @returns {string} The complete URL for the balance endpoint.
   */
  balance: (userID) => `${BASE_URL}/v1/balance?userID=${userID}`,
  memories: getMemoriesURL(MODE),
  checkoutSession: BASE_URL + "/v1/stripe/checkout-session",
  presignURL: BASE_URL + "/v1/presign-url",
}

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyAoYFV3Br2ryvGVXHJDRzEiixosd2VunU8",
  authDomain: "ditto-app-dev.firebaseapp.com",
  projectId: "ditto-app-dev",
  storageBucket: "ditto-app-dev.appspot.com",
  messagingSenderId: "22790208601",
  appId: "1:22790208601:web:b6ee532b2e8a048d1a0548",
  measurementId: "G-KJFMK6PHML",
  webSocketURL: "wss://websocket-server-m4cg7rn54q-uc.a.run.app",
};
