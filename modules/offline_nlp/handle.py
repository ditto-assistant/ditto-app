'''
Multi-Layer Perceptron smart home command resolver.

Python 3.7.x

dataset / refs:
1) https://www.kaggle.com/bouweceunen/smart-home-commands-dataset/code
'''

import pandas as pd
import os
import joblib

from nltk import word_tokenize
from sklearn.model_selection import train_test_split
import itertools
import math

from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from numpy import random

from word2number import w2n

random.seed(2020)

import spacy

class NLP:

    def __init__(self, path):
        self.train = False
        self.path = path.replace('\\','/') + '/modules/offline_nlp/'
        self.ner_play = spacy.load(self.path+'models/ner/play')
        self.ner_timer = spacy.load(self.path+'models/ner/timer')
        self.ner_numeric = spacy.load(self.path+'models/ner/numeric')

    def initialize(self):
        # read in data
        for dirname, _, filenames in os.walk('data/'):
            for filename in filenames:
                print(os.path.join(dirname, filename))

        df = pd.read_csv(self.path+"data/dataset_ditto.csv")


        # Data Preperation
        self.sentences = df['Sentence']
        self.categories = df['Category']
        self.subcategories = df['Subcategory']
        self.actions = df['Action']

        self.uniquecategories = list(set(self.categories))
        self.uniquesubcategories = list(set(self.subcategories))
        self.uniqueactions = list(set(self.actions))

        mergesentences = list(itertools.chain.from_iterable([word_tokenize(sentence.lower()) for sentence in self.sentences]))
        self.vocabulary = list(set(mergesentences))
        # print(vocabulary)


    # calculates how often the word appears in the sentence
    def term_frequency(word, sentence):
        return sentence.split().count(word)

    # calculates how often the word appears in the entire vocabulary
    def document_frequency(self, word):
        return self.vocabulary.count(word)

    # will make sure that unimportant words such as "and" that occur often will have lower weights
    # log taken to avoid exploding of IDF with words such as 'is' that can occur a lot
    def inverse_document_frequency(self, word):
        return math.log(len(self.vocabulary) / (self.document_frequency(word) + 1))

    # get term frequency inverse document frequency value
    def calculate_tfidf(self, word, sentence):
        return self.term_frequency(word, sentence) * self.inverse_document_frequency(word)

    # get one-hot encoded vectors for the targets
    def one_hot_class_vector(self, uniqueclasses, w):
        emptyvector = [0 for i in range(len(uniqueclasses))]
        emptyvector[uniqueclasses.index(w)] = 1
        return emptyvector

    # get one-hot encoded vectors for the words
    def one_hot_vector(self, w):
        emptyvector = [0 for i in range(len(self.vocabulary))]
        emptyvector[self.vocabulary.index(w)] = 1
        return emptyvector

    # get one-hot encdoded sentence vector
    def sentence_vector(self, sentence, tfidf=False):
        tokenizedlist = word_tokenize(sentence.lower())
        sentencevector = [0 for i in range(len(self.vocabulary))]
        count = 0

        for word in tokenizedlist:
            if word in self.vocabulary:
                count = count + 1
                if tfidf:
                    sentencevector = [x + y for x, y in zip(sentencevector, [e * self.calculate_tfidf(word, sentence) for e in self.one_hot_vector(word)])] 
                else:
                    sentencevector = [x + y for x, y in zip(sentencevector, self.one_hot_vector(word))]

        if count == 0:
            return sentencevector
        else:
            return [(el / count) for el in sentencevector]

    def contruct_sentence_vectors(self):
        # constructing sentence vectors
        categoryvectors = [cv.index(1) for cv in [self.one_hot_class_vector(self.uniquecategories, w) for w in self.categories]]
        subcategoryvectors = [cv.index(1) for cv in [self.one_hot_class_vector(self.uniquesubcategories, w) for w in self.subcategories]]
        actionvectors = [cv.index(1) for cv in [self.one_hot_class_vector(self.uniqueactions, w) for w in self.actions]]
        sentencevectors = [self.sentence_vector(sentence) for sentence in self.sentences]

        X_train_cat, X_test_cat, y_train_cat, y_test_cat = train_test_split(sentencevectors, categoryvectors, test_size=0.25, random_state=42)
        X_train_subcat, X_test_subcat, y_train_subcat, y_test_subcat = train_test_split(sentencevectors, subcategoryvectors, test_size=0.25, random_state=42)
        X_train_action, X_test_action, y_train_action, y_test_action = train_test_split(sentencevectors, actionvectors, test_size=0.25, random_state=42)

        # Training base model
        def train_fit(model_name, model, X, y, X_test, y_test):
            model.fit(X, y)
            y_preds = model.predict(X_test)
            accuracy = accuracy_score(y_test, y_preds)
            print(f"{model_name}: {accuracy}")
            return model

        if self.train:
            
            self.mlp_max_iter_model_cat = MLPClassifier(max_iter=10000)
            self.mlp_max_iter_model_cat = train_fit("MLPClassifier", self.mlp_max_iter_model_cat, X_train_cat, y_train_cat, X_test_cat, y_test_cat)
            self.mlp_max_iter_model_subcat = MLPClassifier(max_iter=10000)
            self.mlp_max_iter_model_subcat = train_fit("MLPClassifier", self.mlp_max_iter_model_subcat, X_train_subcat, y_train_subcat, X_test_subcat, y_test_subcat)
            self.mlp_max_iter_model_action = MLPClassifier(max_iter=10000)
            self.mlp_max_iter_model_action = train_fit("MLPClassifier", self.mlp_max_iter_model_action, X_train_action, y_train_action, X_test_action, y_test_action)

            # save
            joblib.dump(self.mlp_max_iter_model_cat, self.path+"models/mlp_max_iter_model_cat.pkl")
            joblib.dump(self.mlp_max_iter_model_subcat, self.path+"models/mlp_max_iter_model_subcat.pkl")
            joblib.dump(self.mlp_max_iter_model_action, self.path+"models/mlp_max_iter_model_action.pkl")

        else:
            # load
            self.mlp_max_iter_model_cat = MLPClassifier()
            self.mlp_max_iter_model_subcat = MLPClassifier()
            self.mlp_max_iter_model_action = MLPClassifier()

            self.mlp_max_iter_model_cat = joblib.load(self.path+"models/mlp_max_iter_model_cat.pkl")
            self.mlp_max_iter_model_subcat = joblib.load(self.path+"models/mlp_max_iter_model_subcat.pkl")
            self.mlp_max_iter_model_action = joblib.load(self.path+"models/mlp_max_iter_model_action.pkl")

            self.mlp_max_iter_model_cat.fit(X_train_cat,y_train_cat)
            self.mlp_max_iter_model_subcat.fit(X_train_subcat, y_train_subcat)
            self.mlp_max_iter_model_action.fit(X_train_action, y_train_action)

    def predict(self, model, classes, sentence):
        y_preds = model.predict([self.sentence_vector(sentence)])
        return classes[y_preds[0]]

    def prompt(self, sentence):
        cat = self.predict(self.mlp_max_iter_model_cat, self.uniquecategories, sentence)
        subcat = self.predict(self.mlp_max_iter_model_subcat, self.uniquesubcategories, sentence)
        action = self.predict(self.mlp_max_iter_model_action, self.uniqueactions, sentence)
        response = '{"category" : "%s", "sub_category" : "%s", "action" : "%s"}' % (cat, subcat, action)
        return response

    def prompt_ner_play(self, sentence):
        artist = ''
        song = ''
        playlist = ''
        reply = self.ner_play(sentence)
        for ent in reply.ents:
            if 'song' in ent.label_:
                song+=ent.text+' '
            if 'artist' in ent.label_:
                artist+=ent.text+' '
            if 'playlist' in ent.label_:
                playlist+=ent.text+' '
        response = '{"song" : "%s", "artist" : "%s", "playlist" : "%s"}' % (song, artist, playlist)
        return response

    def prompt_ner_timer(self, sentence):
        time = ''
        reply = self.ner_timer(sentence)
        for ent in reply.ents:
            if 'time' in ent.label_:
                time+=ent.text+' '
        response = '{"time" : "%s"}' % time
        return response

    def prompt_ner_numeric(self, sentence):
        numeric = ''
        reply = self.ner_numeric(sentence)
        for ent in reply.ents:
            if 'numeric' in ent.label_:
                numeric+=ent.text+' '
        numeric = w2n.word_to_num(numeric.strip())
        response = '{"numeric" : "%s"}' % numeric
        return response


if __name__ == "__main__":
    nlp = NLP(os.getcwd())
    nlp.initialize()
    nlp.contruct_sentence_vectors()
    