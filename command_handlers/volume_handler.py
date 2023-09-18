import json
import requests

from modules.home_assistant.home_assistant import HomeAssistant
from config import AppConfig


class VolumeHandler:
    """
    Handler for changing volume across multiple applications.
    """

    def __init__(self):
        try:
            self.nlp_base_url: str = AppConfig().base_url()
        except BaseException as e:
            print("\nError loading NLP Server in in Volume handler...")
            print(e)

    def prompt_ner_numeric(self, prompt):
        base_url = f"{self.nlp_base_url}/ner/numeric"
        response = requests.post(base_url, params={"prompt": prompt})
        return json.loads(response.content.decode())

    def handle_response(self, prompt: str) -> int:
        """responds with volume percent"""
        ner_response = self.prompt_ner_numeric(prompt)
        volume = int(ner_response["numeric"].split(" ")[0])
        return volume
