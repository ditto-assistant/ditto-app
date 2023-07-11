from tensorflow.keras.models import Sequential
import tensorflow.keras.layers as layers
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from tensorflow import keras
import tensorflow as tf
from matplotlib import pyplot as plt
import numpy as np
import os
import json
from PIL import Image


class FaceValNet:

    def __init__(self, mode='train', path=''):
        self.mode = mode
        self.path = path
        if mode == 'train':
            self.x = np.load(self.path+'data/x.npy')
            self.y = np.load(self.path+'data/y.npy')
            model = self.create_model()
            self.train_model(model)

        else:
            self.model = keras.models.load_model(self.path+'models/FaceValNet')

    def create_model(self):

        model = Sequential([
            # layers.Normalization(),
            layers.Conv2D(filters=32, kernel_size=(5, 5), strides=(
                2, 2), activation='relu', input_shape=(60, 60, 1)),
            layers.BatchNormalization(),
            layers.MaxPool2D(pool_size=(3, 3), strides=(2, 2)),
            layers.Conv2D(filters=64, kernel_size=(5, 5), strides=(
                1, 1), activation='relu', padding="same"),
            layers.BatchNormalization(),
            layers.MaxPool2D(pool_size=(3, 3), strides=(2, 2)),
            layers.Conv2D(filters=128, kernel_size=(3, 3), strides=(
                1, 1), activation='relu', padding="same"),
            layers.BatchNormalization(),
            layers.Flatten(),
            layers.Dense(256, activation='relu'),
            layers.Dropout(0.4),
            # layers.Dense(256, activation='relu'),
            # layers.Dropout(0.4),
            layers.Dense(1, activation='sigmoid'),
        ])

        model.compile(loss='binary_crossentropy',
                      optimizer='adam', metrics='accuracy')
        return model

    def train_model(self, model):
        name = 'FaceValNet'
        self.early_stop_callback = tf.keras.callbacks.EarlyStopping(
            monitor='loss', patience=5, restore_best_weights=True)
        xtrain, xtest, ytrain, ytest = train_test_split(
            self.x, self.y, train_size=0.9)
        self.hist = model.fit(xtrain, ytrain, epochs=90,
                              verbose=1, batch_size=32, callbacks=[self.early_stop_callback])
        loss = self.hist.history['loss']
        acc = self.hist.history['accuracy']
        hist_dict = {"loss": loss, "accuracy": acc}
        self.plot_history(self.hist)
        model.summary()
        ypreds = model.predict(xtest)
        self.ypreds = ypreds
        accuracy = accuracy_score(ytest, np.round(self.ypreds).astype(int))
        print(f'\n\n[Accuracy: {accuracy}]\n\n')
        self.ytest = ytest
        model.save(f'models/{name}')
        with open(f'{name}_training_loss.json', 'w') as f:  # save training loss data
            json.dump(hist_dict, f)

    def plot_history(self, history):
        plt.figure()
        plt.plot(history.history['loss'])
        plt.title('Model Training Loss')
        plt.ylabel('loss')
        plt.xlabel('epoch')
        plt.legend(['training loss'], loc='upper right')


if __name__ == '__main__':
    face_net = FaceValNet(
        mode='train'
    )
