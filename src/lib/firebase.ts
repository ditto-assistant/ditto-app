// Firebase initialization and auth setup
import { firebaseConfig } from "@/firebaseConfig"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
