import pandas
import numpy as np

df = pandas.read_csv('dataset_ditto_base.csv')

with open('chatbot/dialogs.txt', 'r') as f:
    conv_dataset = list(map(lambda x: str(x).split('\t')[0], list(f.readlines())))
conv_ditto = list(map(lambda x: ['conv', 'none', 'none', x], conv_dataset))[0:300] # 300 lines of conversation

add_df = pandas.DataFrame(conv_ditto, columns=['Category', 'Subcategory', 'Action', 'Sentence'])

df = pandas.concat([df, add_df],join='inner', ignore_index=True).to_csv('dataset_ditto.csv', index=False)