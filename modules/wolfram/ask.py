'''
Requests a response from the Wolfram API.

author: Omar Barazanji

refs:
1) https://wolframalpha.readthedocs.io/en/latest/?badge=latest#
'''

import wolframalpha
import json
import os

class Wolfram:

    def __init__(self, path):
        self.path = path.replace('\\','/')
        self.path += "/modules/wolfram/"
        self.load_key()

    def load_key(self):
        if not 'key' in os.listdir(self.path):
            with open(self.path+"key.json", "w") as f:
                f.write('{"key": "API_KEY"}')
        with open(self.path+"key.json", "r") as f:
            key = json.load(f)['key']
            self.client = wolframalpha.Client(key)

    def resolveListOrDict(self, variable):
        if isinstance(variable, list):
            return variable[0]['plaintext']
        else:
            return variable['plaintext']

    def get_response(self, prompt):
        self.response = ''
        self.res = self.client.query(prompt)
        try:
            pod0 = self.res['pod'][0] # query 
            pod1 = self.res['pod'][1] # response
            if (('definition' in pod1['@title'].lower()) or ('result' in  pod1['@title'].lower()) or ('value' in pod1['@title'].lower()) or ((pod1.get('@primary','false') == 'true'))):
                self.response = self.resolveListOrDict(pod1['subpod'])
            return self.response
        except:
            return self.response

if __name__ == "__main__":
    import os
    path = os.getcwd()
    wolf = Wolfram(path)
    print(wolf.get_response("what is the speed of light"))
