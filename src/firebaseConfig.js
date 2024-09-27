// Your web app's Firebase configuration
// const MODE = process.env.NODE_ENV;
const MODE = "production"; // development or production

// http://127.0.0.1:5001/ditto-app-dev/us-central1/openaiEmbed if development
let openAIChatURL = MODE === "development" ? "http://localhost:5001/openai-chat" : "https://backend-22790208601.us-central1.run.app/v1/prompt";
let openAIImageGenerationURL = MODE === "development" ? "http://localhost:5001/openai-image-generation" : "https://openai-chat-m4cg7rn54q-uc.a.run.app/openai-image-generation";
let openAIEmbedURL = MODE === "development" ? "http://localhost:5001/openai-embed" : "https://openai-chat-m4cg7rn54q-uc.a.run.app/openai-embed";
let googleSearchURL = MODE === "development" ? "http://localhost:5001/google-search" : "https://openai-chat-m4cg7rn54q-uc.a.run.app/google-search";

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
  openAIChatURL: openAIChatURL,
  openaiImageGenerationURL: openAIImageGenerationURL,
  openaiEmbedURL: openAIEmbedURL,
  googleSearchURL: googleSearchURL
};