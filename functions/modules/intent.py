import os
import logging
import requests
import tensorflow as tf
from dotenv import load_dotenv

# load environment variables
load_dotenv(override=True)

class IntentModelPredictor:
    def __init__(self, example_store_path):
        self.example_store_path = example_store_path
        self.example_store = None
        self.models = {}
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        if not self.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not set.")

        # Set up logging
        logging.basicConfig(level=logging.DEBUG)
        self.logger = logging.getLogger(__name__)

        # load models
        self.load_models()

    def load_models(self):
        try:
            for model_file in os.listdir('models'):
                if model_file.endswith('.h5'):
                    model_name = model_file.split('.')[0]
                    model = tf.keras.models.load_model(f'models/{model_file}')
                    self.models[model_name] = model
            self.logger.info("Models loaded successfully.")
        except Exception as e:
            self.logger.error(f"Error loading models: {e}")

    def embed_prompt(self, prompt):
        '''
        Load OPENAI_API_KEY from environment variables and use this JS code and convert to python:

        const calculateEmbedding = async (text) => {
    try {
        console.log("Getting embeddings");
        let responseEmbeddings; 
        const apiResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                "input": text,
                "model": "text-embedding-3-small",
                "encoding_format": "float"
            })
        });
        const data = await apiResponse.json();
        responseEmbeddings = data.data[0].embedding;
        return responseEmbeddings
    } catch (error) {
        console.error(error);
        return { error: 'Error getting embeddings' };
    }
}

        '''
        try:
            response = requests.post(
                'https://api.openai.com/v1/embeddings',
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.openai_api_key}'
                },
                json={
                    "input": prompt,
                    "model": "text-embedding-3-small",
                    "encoding_format": "float"
                }
            )
            data = response.json()
            embedding = data['data'][0]['embedding']
            self.logger.info("Embedding calculated successfully.")
            return embedding
        except Exception as e:
            self.logger.error(f"Error calculating embedding: {e}")


    def predict(self, prompt):
        try:
            self.logger.info(f"Predicting intent for prompt: {prompt}")
            prompt_embedding = self.embed_prompt(prompt)
            predictions = {}
            for model_name, model in self.models.items():
                prediction = model.predict([prompt_embedding])
                predictions[model_name] = prediction[0][0]
            # self.logger.info(f"Predictions: {predictions}")
            return predictions
        except Exception as e:
            self.logger.error(f"Error predicting intent: {e}")


if __name__ == '__main__':

    # Example usage
    predictor = IntentModelPredictor('example_store.json')
    prompt = "make an app that can track my daily expenses"
    predictions = predictor.predict(prompt)
    print(predictions)