import json

from modules.wolfram.ask import Wolfram


class WolframHandler:
    def __init__(self, path):
        self.wolfram = Wolfram(path)

    def handle_response(self, sub_cat, prompt):
        if sub_cat == "math":
            reply = self.wolfram.get_response(prompt.lower())
        else:
            reply = self.wolfram.get_response(prompt)

        if not reply == "" and not reply == "(data not available)":
            # reply = reply.split("(")[0]
            print(reply + "\n")

            return reply
        else:
            return ""
