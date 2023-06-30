import json


class ConversationHandler:

    def __init__(self, path=None, offline_mode=False):
        self.offline_mode = offline_mode

    def handle_response(self, command, prompt):
        if not self.offline_mode:
            reply = command.prompt_ditto_memory_agent(prompt)
        else:
            reply = self.offline_chat.prompt(prompt)
            print('\nA: ' + reply)

        return reply
