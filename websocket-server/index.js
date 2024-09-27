const express = require('express');
const { WebSocketServer } = require('ws');
const speech = require('@google-cloud/speech');

const app = express();
const port = process.env.PORT || 8080;
const client = new speech.SpeechClient();

// Serve a simple HTTP response on the root
app.get('/', (req, res) => {
  res.send('WebSocket Server is running');
});

// Start the HTTP server
const server = app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

// Set up WebSocket server on top of the HTTP server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const recognizeStream = client
    .streamingRecognize({
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000, // Ensure this matches your actual audio settings
        languageCode: 'en-US',
      },
      interimResults: true, // Enables real-time transcription
    })
    .on('error', (err) => {
      console.error('StreamingRecognize error:', err);
      ws.close();
    }).on('data', (data) => {
      if (data.results[0] && data.results[0].alternatives[0]) {
        ws.send(JSON.stringify({
          transcript: data.results[0].alternatives[0].transcript,
          isFinal: data.results[0].isFinal
        }));
      }
    });

  ws.on('message', (message) => {
    try {
      recognizeStream.write(message);
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
      recognizeStream.end();
    }
  });

  

  ws.on('close', () => {
    recognizeStream.end();
  });
});

console.log('WebSocket server is ready');