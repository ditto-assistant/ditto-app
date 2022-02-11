'''
Requests a response from the Wolfram API.

author: Omar Barazanji

refs:
1) https://wolframalpha.readthedocs.io/en/latest/?badge=latest#
'''

import wolframalpha
import json

class Wolfram:

    def __init__(self, path):
        self.path = path.replace('\\','/')
        with open(self.path+"/modules/wolfram/key.json", "r") as f:
            key = json.load(f)['key']
            self.client = wolframalpha.Client(key)

    def resolveListOrDict(self, variable):
        if isinstance(variable, list):
            return variable[0]['plaintext']
        else:
            return variable['plaintext']

    def get_response(self, prompt):
        self.response = ''
        res = self.client.query(prompt)
        try:
            pod0 = res['pod'][0] # query 
            pod1 = res['pod'][1] # response
            if (('definition' in pod1['@title'].lower()) or ('result' in  pod1['@title'].lower()) or (pod1.get('@primary','false') == 'true')):
                self.response = self.resolveListOrDict(pod1['subpod'])
            return self.response
        except:
            return self.response

if __name__ == "__main__":
    wolf = Wolfram()
    print(wolf.get_response("what was the temperature in auburn today in 2012"))
