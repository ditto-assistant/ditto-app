// Your web app's Firebase configuration
//const MODE = import.meta.env.MODE
 const MODE = "staging"

function getBaseURL(dittoEnv) {
  switch (dittoEnv) {
    case "development":
      return "http://localhost:3400"
    case "production":
      return "https://backend-22790208601.us-central1.run.app"
    case "staging":
      return "https://staging-backend-22790208601.us-central1.run.app"
    default:
      return "https://backend-22790208601.us-central1.run.app"
  }
}

export const BASE_URL = getBaseURL(MODE)

export const routes = {
  // v1 API
  prompt: BASE_URL + "/v1/prompt",
  embed: BASE_URL + "/v1/embed",
  search: BASE_URL + "/v1/google-search",
  imageGeneration: BASE_URL + "/v1/generate-image",
  searchExamples: BASE_URL + "/v1/search-examples",
  createPrompt: BASE_URL + "/v1/create-prompt",
  saveResponse: BASE_URL + "/v1/save-response",
  /**
   * Generates the URL for retrieving the user's balance.
   *
   * @param {string} userID - The unique identifier of the user.
   * @param {string | null} email - The email of the user.
   * @param {string} version - The version of the app.
   * @param {string} deviceId - The device ID.
   * @returns {string} The complete URL for the balance endpoint.
   */
  balance: (userID, email, version, deviceID) => {
    const url = new URL(`${BASE_URL}/v1/balance`)
    url.searchParams.append("userID", userID)
    url.searchParams.append("email", email ?? "")
    url.searchParams.append("version", version)
    url.searchParams.append("deviceID", deviceID)
    return url.toString()
  },
  checkoutSession: BASE_URL + "/v1/stripe/checkout-session",
  presignURL: BASE_URL + "/v1/presign-url",
  createUploadURL: BASE_URL + "/v1/create-upload-url",
  createPortalSession: BASE_URL + "/v1/stripe/portal-session",
  // v2 API
  memories: BASE_URL + "/api/v2/get-memories",
  promptV2: BASE_URL + "/api/v2/prompt",
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
}
