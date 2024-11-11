const functions = require("firebase-functions");
const express = require("express");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const { Firestore } = require("@google-cloud/firestore");

// Initialize Firebase Admin with service account
const serviceAccount = require("./serviceAccount.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
});

// Initialize Firestore with vector search capabilities
const db = new Firestore({
  projectId: serviceAccount.project_id,
  credentials: serviceAccount,
});

// Initialize express app
const app = express();

// Replace the simple CORS middleware with this updated version
const cors = require("cors");
app.use(
  cors({
    origin: true, // Allows all origins
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Apply middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Keep the logging middleware
app.use((req, res, next) => {
  console.log("Incoming request from origin:", req.headers.origin);
  console.log("Request method:", req.method);
  console.log("Request headers:", req.headers);
  next();
});

// Add middleware to verify Firebase auth token
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Unauthorized - No token provided" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying auth token:", error);
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};

// Get Memories Endpoint
app.post("/get-memories", authenticateUser, async (req, res) => {
  console.log("Getting memories - Starting request processing");
  try {
    const { userId, vector, k = 5 } = req.body;
    console.log(
      `Request parameters: userId=${userId}, k=${k}, vector length=${vector?.length}`,
    );
    // Validate vector dimensions
    if (vector.length > 2048) {
      console.log("Vector dimension exceeds maximum allowed (2048)");
      return res
        .status(400)
        .json({ error: "Vector dimension exceeds maximum allowed (2048)" });
    }

    // Validate k (number of neighbors)
    if (k > 1000) {
      console.log(
        "Number of requested neighbors exceeds maximum allowed (1000)",
      );
      return res
        .status(400)
        .json({
          error: "Number of requested neighbors exceeds maximum allowed (1000)",
        });
    }
    if (!userId || !vector) {
      console.log("Missing parameters:", {
        userId: !!userId,
        vector: !!vector,
      });
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // Get the conversations collection reference
    const memoriesRef = db
      .collection("memory")
      .doc(userId)
      .collection("conversations");

    // Create vector query using findNearest
    const vectorQuery = memoriesRef.findNearest({
      vectorField: "embedding_vector",
      queryVector: vector,
      limit: k,
      distanceMeasure: "COSINE",
      distanceResultField: "vector_distance",
    });

    console.log("Executing vector similarity search...");
    const querySnapshot = await vectorQuery.get();

    console.log(`Retrieved ${querySnapshot.size} documents`);

    const memories = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Calculate similarity score (1 - distance for COSINE)
      // COSINE distance ranges from 0 (identical) to 2 (opposite)
      const similarityScore = 1 - (data.vector_distance || 0);
      console.log(
        `Processing document ${doc.id}, similarity score: ${similarityScore}`,
      );
      memories.push({
        id: doc.id,
        score: similarityScore,
        ...data,
      });
    });

    console.log("Successfully processed request");
    return res.status(200).json({ memories });
  } catch (error) {
    console.error("Error getting memories:", error);
    console.error("Stack trace:", error.stack);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
      stack: error.stack,
    });
  }
});

// Add this test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "CORS test successful" });
});

// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);

// Add local development server
if (process.env.NODE_ENV === "development") {
  const PORT = 5001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
