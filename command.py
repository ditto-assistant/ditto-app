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
        self.response = ''

    def toggle_light(self, val):
            try:
                s =serial.Serial('COM3', baudrate=9600, bytesize=8)
                if val == True:
                    s.write(b'\x02')
                    self.light_status = True
                else:
                    s.write(b'\x01')
                    self.light_status = False
            except:
                print('no device found')

    def response_handler(self, response):
        pass

    def speech_handler(self, speech_text):
        pass

    def send_request(self, command):
        start_sequence = "\nA:"
        restart_sequence = "\nQ:"

        self.response = openai.Completion.create(
            engine="davinci",
            prompt="Q: turn off the lights.\nA: toggle-light `off` \nQ: turn on the lights.\nA: toggle-light `on`\nQ: lights on.\nA: toggle-light `on`\nQ: lights off.\nA: toggle-light `off`\nQ: can you turn the lights on?\nA: toggle-light `on`\nQ: %s" % command,
            temperature=0.5,
            max_tokens=100,
            top_p=1,
            frequency_penalty=0.2,
            presence_penalty=0,
            stop=["\nQ:"]
        )
    
if __name__ == "__main__":
    command = Command()
    # command.send_request("turn em off")