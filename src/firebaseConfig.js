// Your web app's Firebase configuration
const MODE = process.env.NODE_ENV;
// const MODE = "production";

export const URL = {
  prompt: MODE === "development" ? "http://localhost:3400/v1/prompt" : "https://backend-22790208601.us-central1.run.app/v1/prompt",
  embed: MODE === "development" ? "http://localhost:3400/v1/embed" : "https://backend-22790208601.us-central1.run.app/v1/embed",
  search: MODE === "development" ? "http://localhost:3400/v1/google-search" : "https://backend-22790208601.us-central1.run.app/v1/google-search",
  imageGeneration: MODE === "development" ? "http://localhost:3400/v1/generate-image" : "https://backend-22790208601.us-central1.run.app/v1/generate-image",
  searchExamples: MODE === "development" ? "http://localhost:3400/v1/search-examples" : "https://backend-22790208601.us-central1.run.app/v1/search-examples"
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