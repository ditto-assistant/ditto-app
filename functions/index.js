const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// iport dotenv 
require('dotenv').config({ path: '.env', override: true });

// import ExampleStore
const ExampleStore = require('./modules/ExampleStore');

// Initialize express app
const app = express();

// Middleware setup
let originList = [
    'http://localhost:3000', 'https://ditto-app-dev.web.app', 
    'https://ditto-app-dev.firebaseapp.com', 'https://assistant.heyditto.ai'];
if (process.env.NODE_ENV === 'production') {
    // remove localhost from the list
    originList = originList.slice(1);
}
app.use(cors({
    origin: originList,
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// OPENAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GOOGLE_SEARCH_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || "";
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || "";

// Initialize the ExampleStore
const exampleStore = new ExampleStore(
    key = OPENAI_API_KEY,
);

// OPENAI Chat Endpoint
app.post('/openai-chat', async (req, res) => {
    console.log("Getting chat response");
    try {
        const { userPrompt, systemPrompt, model = 'gpt-4o-2024-08-06', imageURL = "", usersOpenaiKey = "", balance = 0 } = req.body;
        let responseMessage = "";

        const keyToUse = usersOpenaiKey || (Number(balance) > 0 ? OPENAI_API_KEY : "");
        if (!keyToUse) {
            responseMessage = "You have no API key or your balance is too low.";
            return res.status(400).json({ response: responseMessage });
        }

        const withImage = imageURL !== "";
        const content = withImage
            ? [{ "type": "text", "text": userPrompt }, { "type": "image_url", "image_url": { "url": imageURL } }]
            : userPrompt;

        const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${keyToUse}`
            },
            body: JSON.stringify({
                "model": model,
                "messages": [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": content }
                ]
            })
        });

        const data = await apiResponse.json();
        responseMessage = data.choices[0].message.content;

        return res.status(200).json({ response: responseMessage });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// OPENAI Image Generation Endpoint
app.post('/openai-image-generation', async (req, res) => {
    try {
        console.log("Generating image");
        const { prompt, model = 'dall-e-3', usersOpenaiKey = "", balance = 0 } = req.body;
        let responseMessage = "";

        const keyToUse = usersOpenaiKey || (Number(balance) > 0 ? OPENAI_API_KEY : "");
        if (!keyToUse) {
            responseMessage = "You have no API key or your balance is too low.";
            return res.status(400).json({ response: responseMessage });
        }

        const apiResponse = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${keyToUse}`
            },
            body: JSON.stringify({
                "model": model,
                "prompt": prompt,
                "n": 1,
                "size": "1024x1024"
            })
        });

        const data = await apiResponse.json();
        responseMessage = data;

        return res.status(200).json({ response: responseMessage });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// OPENAI Embed Endpoint
app.post('/openai-embed', async (req, res) => {
    try {
        console.log("Getting embeddings");
        const { text, usersOpenaiKey = "", balance = 0 } = req.body;
        let responseMessage = "";

        const keyToUse = usersOpenaiKey || (Number(balance) > 0 ? OPENAI_API_KEY : "");
        if (!keyToUse) {
            responseMessage = "You have no API key or your balance is too low.";
            return res.status(400).json({ response: responseMessage });
        }

        const apiResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${keyToUse}`
            },
            body: JSON.stringify({
                "input": text,
                "model": "text-embedding-3-small",
                "encoding_format": "float"
            })
        });

        const data = await apiResponse.json();
        responseMessage = data.data[0].embedding;

        return res.status(200).json({ embedding: responseMessage });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Google Search Endpoint
app.post('/google-search', async (req, res) => {
    const { query, numResults } = req.body;
    try {
        const response = await fetch(`https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_SEARCH_ENGINE_ID}&q=${query}&num=${numResults}`);
        const data = await response.json();
        const dataItems = data.items;
        let searchResults = "\n\n";
        dataItems.forEach((item, index) => {
            searchResults += `${index + 1}. [${item.title}](${item.link})
        - ${item.snippet}

    `;
        });
        return res.status(200).json({ searchResults });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


// get Examples Endpoint
app.post('/get-examples', async (req, res) => {
    console.log("Getting examples");
    // load the examples
    await exampleStore.loadStore('./modules/exampleStore.json');
    try {
        const { embedding, k } = req.body;
        const examples = await exampleStore.getTopKSimilarExamples(embedding, k);
        return res.status(200).json({ examples });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Start the server
let port = 5001;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});