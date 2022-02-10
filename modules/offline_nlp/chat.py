'''
Chatbot using conversation data.

author: Omar Barazanji

refs and data:
1) https://www.kaggle.com/akshitrai/chatbot-jarvis
2) https://www.kaggle.com/akshitrai/chatbot-jarvis/data
'''

import numpy as np 
import string
from nltk.corpus import stopwords
import pandas as pd 
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.tree import DecisionTreeClassifier
from sklearn.feature_extraction.text import TfidfTransformer,TfidfVectorizer
from sklearn.pipeline import Pipeline

class Chat:

    def __init__(self):
        self.df = pd.read_csv('data/chatbot/dialogs.txt',sep='\t')
        data = pd.Series(self.df.columns)
        data = data.rename({0: self.df.columns[0],1: self.df.columns[1]})
        add1 = {'Questions':"what's your name?",'Answers':"I'm Ditto!"}
        add2 = {'Questions':"what's your name?",'Answers':'My name is Ditto.'}
        self.df = self.df.append(data,ignore_index=True)
        self.df.columns=['Questions','Answers']
        self.df = self.df.append([add1, add2],ignore_index=True)

    def cleaner(self, x):
        return [a for a in (''.join([a for a in x if a not in string.punctuation])).lower().split()]
    
    def train(self):
        self.Pipe = Pipeline([
            ('bow',CountVectorizer(analyzer=self.cleaner)),
            ('tfidf',TfidfTransformer()),
            ('classifier',DecisionTreeClassifier())
        ])
        self.Pipe.fit(self.df['Questions'],self.df['Answers'])

    def prompt(self, prompt):
        return self.Pipe.predict([prompt])[0]

if __name__ == "__main__":
    chat = Chat()
    chat.train()
    print(chat.prompt('yo bro!'))
