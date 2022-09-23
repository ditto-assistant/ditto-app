import json

class ConversationHandler:

    def __init__(self):
        pass

    def handle_response(self, command, prompt):
        command_response = command.send_gpt3_command(prompt+'.')
        raw_reply = command_response
        command.inject_response(prompt+'.', raw_reply) # add user's prompt and gpt3's response to conversation prompt for context
        reply = ""

        if '\\n' in raw_reply: # render newlines from reply
            raw_reply = raw_reply.split('\\n')
            print('\nA: ')
            for x in raw_reply:
                print(x)
                reply = reply + " " + x.strip('\\') 
        else: 
            print('\nA: '+ raw_reply)
            reply = raw_reply

        return reply