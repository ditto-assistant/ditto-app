import json
import requests

from modules.home_assistant.home_assistant import HomeAssistant


class VolumeHandler():
    """
    Handler for changing volume across multiple applications.
    """

    def __init__(self, config):
        try:
            self.nlp_ip = config['nlp-server']
        except BaseException as e:
            print('\nError loading NLP Server in in Volume handler...')
            print(e)

    def prompt_ner_numeric(self, prompt):
        base_url = f"http://{self.nlp_ip}:32032/ner/"
        response = requests.post(base_url, params={"ner-numeric": prompt})
        return json.loads(response.content.decode())

    def handle_response(self, prompt:str) -> int:
        '''responds with volume percent'''
        ner_response = self.prompt_ner_numeric(prompt)    
        volume = int(ner_response['numeric'].split(' ')[0])
        return volume
