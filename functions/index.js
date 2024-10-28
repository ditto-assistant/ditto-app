const functions = require('firebase-functions');
const express = require('express');
const bodyParser = require('body-parser');
const { getFirestore } = require('firebase-admin/firestore');
const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('./serviceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = getFirestore();

// Initialize express app
const app = express();

// Replace the simple CORS middleware with this updated version
const cors = require('cors');
app.use(cors({
    origin: true, // Allows all origins
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Apply middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Keep the logging middleware
app.use((req, res, next) => {
    console.log('Incoming request from origin:', req.headers.origin);
    console.log('Request method:', req.method);
    console.log('Request headers:', req.headers);
    next();
});

// Add middleware to verify Firebase auth token
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};

// Get Memories Endpoint
app.post('/get-memories', authenticateUser, async (req, res) => {
    console.log("Getting memories - Starting request processing");
    try {
        const { userId, vector, k = 5 } = req.body;
        console.log(`Request parameters: userId=${userId}, k=${k}, vector length=${vector?.length}`);
        
        if (!userId || !vector) {
            console.log("Missing parameters:", { userId: !!userId, vector: !!vector });
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // First try to get the collection reference
        console.log(`Accessing collection: memory/${userId}/conversations`);
        const memoriesRef = db.collection('memory').doc(userId).collection('conversations');
        
        // Get documents normally first as a fallback
        console.log("Fetching documents...");
        const querySnapshot = await memoriesRef
            .orderBy('timestamp', 'desc')
            .limit(k)
            .get();

        console.log(`Retrieved ${querySnapshot.size} documents`);
        
        const memories = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`Processing document ${doc.id}, has embedding: ${!!data.embedding}`);
            const similarityScore = cosineSimilarity(vector, data.embedding || []);
            console.log(`Calculated similarity score: ${similarityScore}`);
            memories.push({
                id: doc.id,
                score: similarityScore,
                ...data
            });
        });

        console.log(`Sorting ${memories.length} memories by similarity score`);
        memories.sort((a, b) => b.score - a.score);

        console.log("Successfully processed request");

        return res.status(200).json({ memories });
    } catch (error) {
        console.error("Error getting memories:", error);
        console.error("Stack trace:", error.stack);
        return res.status(500).json({ 
            error: 'Internal Server Error',
            details: error.message,
            stack: error.stack
        });
    }
});

// Add cosine similarity function
function cosineSimilarity(a, b) {
    try {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
            return 0;
        }
        const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dot / (magA * magB) || 0;
    } catch (e) {
        console.error('Error calculating similarity:', e);
        return 0;
    }
}

// Add this test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'CORS test successful' });
});

// Export the Express app as a Firebase Cloud Function
exports.api = functions.https.onRequest(app);

// Add local development server
if (process.env.NODE_ENV === 'development') {
    const PORT = 5001;
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
