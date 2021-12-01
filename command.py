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
        self.light_status = False

    def toggle_light(self):
        try:
            s =serial.Serial('COM3', baudrate=9600, bytesize=8)
            s.write(b'\xA1')
            self.light_status = not self.light_status
        except:
            print('no device found')

    def response_handler(self, response):
        pass

    def speech_handler(self, speech_text):
        pass

    def send_request(self, command):
        start_sequence = "\nA:"
        restart_sequence = "\nQ:"

        response = openai.Completion.create(
        engine="davinci",
        prompt="Q: turn off the lights.\nA: toggle-light `off` \nQ: turn on the lights.\nA: toggle-light `on`\nQ: lights on.\nA: toggle-light `on`\nQ: lights off.\nA: toggle-light `off`\nQ: can you turn the lights on?\nA: toggle-light `on`\nQ: ",
        temperature=0.5,
        max_tokens=100,
        top_p=1,
        frequency_penalty=0.2,
        presence_penalty=0,
        stop=["\n"]
        )