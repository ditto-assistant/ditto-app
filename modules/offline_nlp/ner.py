'''
Named Entity Recognition model.

author: Omar Barazanji

refs:
https://towardsdatascience.com/named-entity-recognition-ner-using-keras-bidirectional-lstm-28cd3f301f54

dataset:
https://www.kaggle.com/abhinavwalia95/entity-annotated-corpus
'''

import nltk
from nltk.tokenize import word_tokenize
from nltk.tag import pos_tag
nltk.download('averaged_perceptron_tagger')

prompt = 'play Crucial by False Jasmine'

def preprocess(sent):
    sent = nltk.word_tokenize(sent)
    sent = nltk.pos_tag(sent)
    return sent

sent = preprocess(prompt)
print(sent)

