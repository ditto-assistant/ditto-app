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

    def send_request(self, command):
        self.command_input = command
        start_sequence = "\nA:"
        restart_sequence = "\nQ:"
        
        self.response = openai.Completion.create(
            engine="ada",
            prompt="Q: turn off the lights.\nA: toggle-light `off` \nQ: turn on the lights.\nA: toggle-light `on`\nQ: lights on.\nA: toggle-light `on`\nQ: lights off.\nA: toggle-light `off`\nQ: can you turn the lights on?\nA: toggle-light `on`\nQ: toggle lights\nA: toggle-light `off`\nQ: toggle lights\nA: toggle-light `on`\nQ: set the lights to sparkle\nA: toggle-light `sparkle`\nQ: put the lights on sparkle mode\nA: toggle-light `sparkle`\nQ: sparkle\nA: toggle-light `sparkle`\nQ: %s" % command,
            temperature=0.05,
            max_tokens=100,
            top_p=1,
            frequency_penalty=0.2,
            presence_penalty=0,
            stop=["\nQ:"]
        )

    
if __name__ == "__main__":
    command = Command()
    # command.send_request("turn em off")