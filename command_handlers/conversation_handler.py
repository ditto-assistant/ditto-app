import os
import requests
from datetime import datetime
import time

import openai

try:
    openai.api_key = os.getenv("OPENAI_API_KEY")
except:
    print('openai key error')



class ConversationHandler:

    def __init__(self, config, offline_mode=False):
        self.config = config
        self.offline_mode = offline_mode
        self.conversation_memory_buffer = []
        

    def reset_conversation(self):
        self.conversation_memory_buffer = []
        # try:
        #     ip = self.config['nlp-server']
        #     requests.post(f'http://{ip}:32032/prompt/?reset=1', timeout=30)
        # except BaseException as e:
        #     print(e)

    def prompt_ditto_memory_agent(self, query):
        res = ''
        query_with_short_term_memory = query
        stamp = str(datetime.utcfromtimestamp(time.time()))
        if len(self.conversation_memory_buffer) > 1:
            query_with_short_term_memory = '<STMEM>Short Term Memory Buffer:\n'
            for q, r, s in self.conversation_memory_buffer:
                query_with_short_term_memory += f'Human: ({s}): '+q+'\n'
                query_with_short_term_memory += f'AI: '+r+'\n'
            query_with_short_term_memory += f'<STMEM>{query}'
        try:
            ip = self.config['nlp-server']
            res = requests.post(
                f'http://{ip}:32032/prompt/?prompt={query_with_short_term_memory}', timeout=30)
            res = str(res.content.decode().strip())
            print('\nA: ', res+'\n')
            self.conversation_memory_buffer.append((query, res, stamp))
            if len(self.conversation_memory_buffer) > 5:
                self.conversation_memory_buffer = self.conversation_memory_buffer[1:]

        except BaseException as e:
            print(e)
            res = '[Error communicating with OpenAI... Please try again!]'
        return res

    def handle_response(self, prompt):
        if not self.offline_mode:
            reply = self.prompt_ditto_memory_agent(prompt)
        else:
            # offline chat ...
            pass

        return reply
