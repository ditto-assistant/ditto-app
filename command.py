"""
Sends a prompt to a GPT-3 model.

author: Omar Barazanji

refs:
1) https://github.com/openai/openai-python

notes:
1) run the following for first time:
    $env:OPENAI_API_KEY="your-key-here"
"""

import os
import openai
import serial

openai.api_key = os.getenv("OPENAI_API_KEY")

class Command:

    def __init__(self):
        self.light_status = True
        self.light_mode = 'default'
        self.response = ''
        self.command_input = ''

    def toggle_light(self, mode):
        try:
            s =serial.Serial('COM3', baudrate=9600, bytesize=8)
            if mode == 'on':
                s.write(b'\x00')
                self.light_status = True
                self.light_mode = 'default'
            elif mode == 'off':
                s.write(b'\x01')
                self.light_status = False
            elif mode == 'sparkle':
                self.light_mode = 'sparkle'
                s.write(b'\x02')
            else:
                print('not a valid light mode')
                self.light_mode = self.light_mode
        except:
            print('no device found')


    def response_handler(self, response):
        pass

    def speech_handler(self, speech_text):
        pass

    def send_request(self, command, model):
        self.command_input = command
        start_sequence = "\nA:"
        restart_sequence = "\nQ:"

        if model == 'model-selector':
            self.response = openai.Completion.create(
                    engine="babbage",
                    prompt="Q: turn off the lights\nA: light-application \nQ: turn on the lights\nA: light-application \nQ: set the lights to sparkle\nA: light-application \nQ: put the lights on sparkle mode\nA: light-application \nQ: how are you doing\nA: conversation-application \nQ: what's the meaning of life\nA: conversation-application \nQ: i hope your day is going well.\nA: conversation-application \nQ: yo\nA: conversation-application \nQ: can you turn the lights off\nA: light-application\nQ: write me a poem\nA: conversation-application \nQ: how do you split and atom in half\nA: conversation-application\nQ: %s" % command,
                    temperature=0,
                    max_tokens=100,
                    top_p=1,
                    frequency_penalty=0.2,
                    presence_penalty=0,
                    stop=["\nQ: "]
                )
        elif model == 'light-application':
            self.response = openai.Completion.create(
                engine="ada",
                prompt="Q: turn off the lights.\nA: toggle-light `off`\nQ: turn on the lights.\nA: toggle-light `on`\nQ: lights on.\nA: toggle-light `on`\nQ: lights off.\nA: toggle-light `off`\nQ: can you turn the lights on?\nA: toggle-light `on`\nQ: toggle lights\nA: toggle-light `off`\nQ: toggle lights\nA: toggle-light `on`\nQ: set the lights to sparkle\nA: toggle-light `sparkle`\nQ: put the lights on sparkle mode\nA: toggle-light `sparkle`\nQ: sparkle\nA: toggle-light `sparkle`\nQ: turn the lights on.\nA: toggle-light `on`\nQ: set the lights to sparkle\nA: toggle-light `sparkle`\nQ: turn off the lights.\nA: toggle-light `off`\nQ: set the was to sparkle\nA: toggle-light `sparkle`\nQ: %s" % command,
                temperature=0.05,
                max_tokens=100,
                top_p=1,
                frequency_penalty=0.2,
                presence_penalty=0,
                stop=["\nQ: "]
            )
        elif model == 'conversation-application':
            self.response = openai.Completion.create(
                engine="curie",
                prompt="Q: hello.\nA: toggle-conversation `Hello! What's up? \nQ: what's the population of Brazil?\nA: toggle-conversation `212.6 million as of 2020.`\nQ: what's the meaning of life?\nA: toggle-conversation `the meaning of life is to love oneself and to spread love to others.`\nQ: can you take the square root of a negative number?\nA: toggle-conversation `The square root of a negative number does not exist among the set of real numbers; however, the imaginary number \"i\" is the square root of negative one.`\nQ: can you write me a poem?\nA: toggle-conversation `Despite the storms, \\nbeauty arrives like \\nit was always going to. \\nDespite the darkness, \\nthe light returns. \\nDespite your loss, \\nyour heart will be \\nfull again. \\nDespite the breaking, \\nyour heart will feel \\nlike it belongs in the \\nland of joy once more. \\nThis is how it will \\nalways be. Keep living.`\nQ: can you tell me who the president of the United States was in 1975?\nA: toggle-conversation `Gerald Ford was the president of the United States in 1975.`\nQ: write me a song\nA: toggle-conversation `I'm not a musician, but I'll give it a shot. \\n \\nFresh day in the simulation \\nSleep all day, it's living \\nFlying at the speed of light, \\nIt's really gonna be alright.`\nQ: %s" % command,
                temperature=0.6,
                max_tokens=150,
                top_p=1,
                frequency_penalty=0.2,
                presence_penalty=0,
                stop=["\nQ: "]
            )
    
if __name__ == "__main__":
    command = Command()
    # command.send_request("turn em off")