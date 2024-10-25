'''
Tensorflow module for ingesting the example store and creating intent models per example store type.

exampleStore.json is structured as follows:

[
    {
    "name": "Example Type Name Here",
    "version": "1.0",
    "description": "Example Type Description Here",
    "examples": [
        {
            "prompt": "Example text here",
            "promptEmbedding": [0.1, 0.2, 0.3, ...],
        },
        {
            "prompt": "Another example text here",
            "promptEmbedding": [0.4, 0.5, 0.6, ...],
        },
        ...
    ]
    },
    ...
[

## Task
1. Create a new intent model for each example store type, using the prompt embeddings as training data.
2. Save the trained models to the models/ directory (create if it doesn't exist).
3. Use tensorflow and make sure to plot the training history for each model using matplotlib.
4. I'd like to see the loss and accuracy plots for each model in the same figure ( a big plot that shows all the models' training history and accuracies).
5. Make sure to save the plot as a .png file in the plots/ directory before plotting (create directory if it doesn't exist).
6. Use logging to log.info() before each function call and log.debug() within the functions to log the progress of the script.
7. Use the logging module to log any errors that occur during the script execution as log.error().
8. Make sure this is all in a class called IntentModelTrainer with the following methods:
    - __init__(self, example_store_path)
    - load_example_store(self)
    - create_intent_models(self)
    - save_intent_models(self)
    - plot_training_history(self)
    - run(self)
'''

import os
import json
import logging
import requests
import tensorflow as tf
import matplotlib.pyplot as plt
from datetime import datetime
from dotenv import load_dotenv
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense
from tensorflow.keras.optimizers import Adam
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# load environment variables
load_dotenv(override=True)

class IntentModelTrainer:
    def __init__(self, example_store_path):
        self.example_store_path = example_store_path
        self.example_store = None
        self.models = {}
        self.model_histories = {}

        # Set up logging
        logging.basicConfig(level=logging.DEBUG)
        self.logger = logging.getLogger(__name__)

    def load_example_store(self):
        try:
            with open(self.example_store_path, 'r') as f:
                self.example_store = json.load(f)
            self.logger.info("Example store loaded successfully.")
        except Exception as e:
            self.logger.error(f"Error loading example store: {e}")

    def create_intent_models(self):
        '''the X data will be ALL the promptEmbeddings from the example store and the Y data will be set to 1 for that example store type and 0 for all others.'''
        try:
            for example_type in self.example_store:
                model_name = example_type['name']
                self.models[model_name] = Sequential([
                    Dense(128, activation='relu', batch_input_shape=(None, 768)),
                    Dense(64, activation='relu'),
                    Dense(1, activation='sigmoid')
                ])
                self.models[model_name].compile(
                    optimizer=Adam(learning_rate=0.001), 
                    loss='binary_crossentropy', 
                    metrics=['accuracy']
                )

                X = []
                Y = []
                for example_type in self.example_store:
                    for exampleObj in example_type['examples']:
                        if model_name == example_type['name']:
                            y = 1
                        else:
                            y = 0
                        x = exampleObj['promptEmbedding']
                        X.append(x)
                        Y.append(y)

                # log the shape of X and y
                self.logger.debug(f"X shape: {len(X)}")
                self.logger.debug(f"Y shape: {len(Y)}")

                X_train, X_test, y_train, y_test = train_test_split(X, Y, test_size=0.2, random_state=42)

                # log the shape of each tensor
                self.logger.debug(f"X_train shape: {len(X_train)}")
                self.logger.debug(f"X_test shape: {len(X_test)}")
                self.logger.debug(f"y_train shape: {len(y_train)}")
                self.logger.debug(f"y_test shape: {len(y_test)}")

                history = self.models[model_name].fit(X_train, y_train, validation_data=(X_test, y_test), epochs=20, batch_size=32)
                self.model_histories[model_name] = history

                y_pred = self.models[model_name].predict(X_test)
                accuracy = accuracy_score(y_test, y_pred.round())
                self.logger.info(f"Model {model_name} trained with accuracy: {accuracy}")
        except Exception as e:
            self.logger.error(f"Error creating intent models: {e}")

    def save_intent_models(self):
        try:
            if not os.path.exists('models'):
                os.makedirs('models')

            for model_name, model in self.models.items():
                model.save(f'models/{model_name.replace(" ", "")}.h5')
                self.logger.info(f"Model saved for {model_name}.")
        except Exception as e:
            self.logger.error(f"Error saving intent models: {e}")

    def plot_training_history(self):
        try:
            if not os.path.exists('plots'):
                os.makedirs('plots')

            plt.figure(figsize=(12, 8))
            for model_name, history in self.model_histories.items():
                plt.plot(history.history['loss'], label=f'{model_name} - Loss')
                plt.plot(history.history['accuracy'], label=f'{model_name} - Accuracy')

            plt.title('Training History')
            plt.xlabel('Epoch')
            plt.legend()
            plt.savefig(f'plots/training_history_{datetime.now().strftime("%Y%m%d%H%M%S")}.png')
            self.logger.info("Training history plot saved.")
        except Exception as e:
            self.logger.error(f"Error plotting training history: {e}")

    def run(self):
        self.load_example_store()
        self.create_intent_models()
        self.save_intent_models()
        self.plot_training_history()


if __name__ == '__main__':
    trainer = IntentModelTrainer('exampleStore.json')
    trainer.run()

