"""
Combines speech to text and gpt3 api to make commands.

author: Omar Barazanji
"""

from speech import Speech
from command import Command

class Assistant:

    def __init__(self):
        self.speech = Speech()
        self.command = Command()
        self.prompt = ""

    def get_speech(self):
        pass

    def activation_sequence(self):
        self.speech.record_audio(True)
        if self.speech.activation.activate: # name has been spoken
            self.speech.activation.activate = False
            self.speech.text = ""
            self.speech.activation.text = ""

            print('   ,.,')
            print(' ((~"~))')
            print("'(|o_o|)'")
            print(",..\=/..,")

            self.speech.record_audio(False)
            if self.speech.activation.activate: 
                print('sending request to GPT3')
                self.speech.activation.activate = False
                self.command.send_request(self.speech.text)

                self.speech.text = ""
                self.speech.activation.text = ""

                self.command_response = self.command.response.choices.pop()['text'].strip('.\nA: ')

                if 'toggle-light' in self.command_response:
                    if 'off' in self.command_response:
                        self.command.toggle_light(False)
                        print('Turning off the lights')
                    if 'on' in self.command_response:
                        self.command.toggle_light(True)
                        print('Turning on the lights')
            else: print('Canceling...')
                

if __name__ == "__main__":
    assistant = Assistant()
    while True:
        assistant.activation_sequence()

    # assistant.command(text)