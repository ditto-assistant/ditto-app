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
        self.llm_api_key = os.getenv('GCLOUD_BEARER_TOKEN')
        if not self.llm_api_key:
            raise ValueError("GCLOUD_BEARER_TOKEN is not set.")

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
        try:
            response = requests.post(
                'https://us-central1-aiplatform.googleapis.com/v1/projects/ditto-app-dev/locations/us-central1/publishers/google/models/text-embedding-004:predict',
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.llm_api_key}'
                },
                json={
                    "instances": [
                        {"content": prompt}
                    ]
                }
            )
            embeddings = response.json()['predictions'][0]['embeddings']['values']
            return embeddings
        except Exception as e:
            self.logger.error(f"Error embedding prompt: {e}")


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