// IntentRecognition.js
import * as tf from "@tensorflow/tfjs";

// Define the model list
const modelList = [
  "GoogleSearch",
  "HomeAssistant",
  "HTMLAgent",
  "ImageGeneration",
  "OpenSCADAgent",
];

export default class IntentRecognition {
  constructor() {
    this.models = {};
    this.isLoaded = false;
    this.modelLoadPromises = [];
    console.log("IntentRecognition instance created");
  }

  async loadModels() {
    console.log("loadModels called");
    if (this.isLoaded) {
      console.log("Models already loaded, returning");
      return;
    }

    try {
      // Load each model
      this.modelLoadPromises = modelList.map(async (modelName) => {
        console.log(`Attempting to load model: ${modelName}`);
        try {
          const modelUrl = `/models/${modelName}/model.json`;
          const model = await tf.loadLayersModel(modelUrl);
          console.log(`Model ${modelName} loaded successfully`);
          this.models[modelName] = model;
        } catch (err) {
          console.error(`Error loading model ${modelName}:`, err);
          console.error("Error details:", err.message);
          if (err.stack) {
            console.error("Error stack:", err.stack);
          }
          throw err;
        }
      });

      // Wait for all models to load
      console.log("Waiting for all models to load...");
      await Promise.all(this.modelLoadPromises);
      this.isLoaded = true;
      console.log("All intent models loaded successfully");
    } catch (err) {
      console.error("Error in loadModels:", err);
      console.error("Error details:", err.message);
      if (err.stack) {
        console.error("Error stack:", err.stack);
      }
      throw err;
    }
  }

  async classify(embedding) {
    if (!this.isLoaded) {
      console.error("Models not loaded. Call loadModels() first.");
      throw new Error("Models not loaded. Call loadModels() first.");
    }

    console.log("Inferring intent from IR Models...");

    try {
      // Convert embedding to tensor
      const embeddingTensor = tf.tensor2d([embedding]);
      const predictions = {};

      // Run prediction for each model
      for (const [modelName, model] of Object.entries(this.models)) {
        const prediction = await model.predict(embeddingTensor).data();
        predictions[modelName] = prediction[0];
      }

      // Cleanup
      embeddingTensor.dispose();

      return predictions;
    } catch (err) {
      console.error("Error in classify:", err);
      console.error("Error details:", err.message);
      if (err.stack) {
        console.error("Error stack:", err.stack);
      }
      throw err;
    }
  }

  dispose() {
    console.log("dispose called");
    try {
      // Clean up TensorFlow.js resources
      for (const [modelName, model] of Object.entries(this.models)) {
        if (model) {
          console.log(`Disposing model: ${modelName}`);
          model.dispose();
        }
      }
      this.models = {};
      this.isLoaded = false;
      console.log("Intent recognition resources cleaned up");
    } catch (err) {
      console.error("Error in dispose:", err);
      console.error("Error details:", err.message);
      if (err.stack) {
        console.error("Error stack:", err.stack);
      }
    }
  }
}
