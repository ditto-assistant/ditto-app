// Your web app's Firebase configuration
const MODE = import.meta.env.MODE
// const MODE = "staging"

function getBaseURL(dittoEnv: string) {
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

const getPGVectorAPIURL = () => {
  switch (MODE) {
    case "development":
      return "http://localhost:8080"
    // case "staging":
    //   return "http://localhost:8080"
    default:
      return "https://agentic-pipelines-22790208601.us-central1.run.app"
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
  balance: (
    userID: string,
    email: string,
    version: string,
    deviceID: string
  ) => {
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
  pgVectorAPIURL: getPGVectorAPIURL(),
  // Knowledge Graph Endpoints
  kgSubjectsSearch: getPGVectorAPIURL() + "/kg/subjects/search",
  kgPairsSearch: getPGVectorAPIURL() + "/kg/pairs/search",
  kgSubjectPairs: getPGVectorAPIURL() + "/kg/subjects/pairs",
  kgSubjectPairsRecent: getPGVectorAPIURL() + "/kg/subjects/pairs/recent",
  kgTopSubjects: getPGVectorAPIURL() + "/kg/subjects/top",
  // Memory Management Endpoints
  kgDeleteMemoryPair: (pairId: string) =>
    getPGVectorAPIURL() + `/memory/pairs/${pairId}/delete`,
  kgRenameSubject: (subjectId: string) =>
    getPGVectorAPIURL() + `/kg/subjects/${subjectId}/rename`,
  // Sync Endpoints
  kgSyncUser: getPGVectorAPIURL() + "/sync-user",
  syncStatus: getPGVectorAPIURL() + "/sync-status",
  pairSubjects: getPGVectorAPIURL() + "/pairs/subjects",
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
