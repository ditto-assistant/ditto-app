import json

class WolframHandler():

    def __init__(self):
        pass

    def handle_response(self, command, sub_cat, prompt):
        if sub_cat == 'math':
            reply = command.wolfram.get_response(prompt.lower())
        else: 
            reply = command.wolfram.get_response(prompt)

        if not reply == '' and not reply == '(data not available)':
            # reply = reply.split("(")[0]
            print(reply+'\n')

            return reply
        else: return ''