import json
import os
import requests
from datetime import datetime
import time
from config import AppConfig
import openai

try:
    openai.api_key = os.getenv("OPENAI_API_KEY")
except:
    print("openai key error")


class ConversationHandler:
    def __init__(self, config, offline_mode=False):
        self.config = AppConfig()
        self.user_id = self.config.user_id
        self.nlp_base_url = self.config.base_url()
        self.offline_mode = offline_mode
        # self.conversation_memory_buffer = []

    def reset_conversation(self):
        # self.conversation_memory_buffer = []
        try:
            requests.post(
                f"{self.nlp_base_url}/users/{self.user_id}/reset_memory", timeout=30
            )
        except BaseException as e:
            print(e)

    def prompt_ditto_memory_agent(self, query, face_name="none"):
        try:
            params = {
                "prompt": query,
                "face_name": face_name,
            }
            res = requests.post(
                f"{self.nlp_base_url}/users/{self.user_id}/prompt_llm",
                params=params,
                timeout=120,
            )
            res = json.loads(str(res.content.decode().strip()))

        except BaseException as e:
            print(e)
            res = "[Error communicating with OpenAI... Please try again!]"

        return res["response"]

    def handle_response(self, prompt, face_name=None):
        if not self.offline_mode:
            reply = self.prompt_ditto_memory_agent(prompt, face_name=face_name)
        else:
            # offline chat ...
            pass

        return reply
