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
import json

# https://github.com/mclarkk/lifxlan
import lifxlan

from modules.hourglass.timer import Timer
from modules.spotify.spotify import Spotify
from modules.weather.grab import Weather
from modules.wolfram.ask import Wolfram

openai.api_key = os.getenv("OPENAI_API_KEY")

class Command:

    def __init__(self, path):

        self.weather_app = Weather()
        self.wolfram = Wolfram(path)

        self.path = path
        self.light_status = True
        self.light_mode = 'on'
        self.response = ''
        self.command_input = ''
        
        try:
            self.player = Spotify(self.path+"/modules/spotify")
        except BaseException as e:
            print(e)
            self.player = []
        self.conversation_prompt = "{\"reply\": \"hello, human.\"}\nuser: hello.\n{\"reply\": \"Hello! What's up?\"}\nuser: how are you.\n{\"reply\": \"I'm doing great! How are you?\"}\nuser: what is your name.\n{\"reply\": \"My name is Ditto!\"}\nuser: what is your name.\n{\"reply\": \"Ditto.\"}\nuser: what is your purpose.\n{\"reply\": \"I am here to provide information I was trained on. I will try and be as correct and precise as I can.\"}\nuser: what's the meaning of life.\n{\"reply\": \"the meaning of life is to love oneself and to spread love to others.\"}\nuser: can you take the square root of a negative number.\n{\"reply\": \"The square root of a negative number does not exist among the set of real numbers; however, the imaginary number \"i\" is the square root of negative one.\"}\nuser: can you write me a poem.\n{\"reply\": \"Despite the storms, \\nbeauty arrives like \\nit was always going to. \\nDespite the darkness, \\nthe light returns. \\nDespite your loss, \\nyour heart will be \\nfull again. \\nDespite the breaking, \\nyour heart will feel \\nlike it belongs in the \\nland of joy once more. \\nThis is how it will \\nalways be. Keep living.\"}\nuser: hey man.\n{\"reply\": \"Hey man!\"}\nuser: can you tell me who the president of the United States was in 1975?\n{\"reply\": \"Gerald Ford was the president of the United States in 1975.\"}\nuser: say something wrong.\n{\"reply\": \"I'm not perfect. I have mistakes. But I'm trying to be better.\"}\nuser: write me another song or poem.\n{\"reply\": \"A gift for you \\nA gift for me \\nYou're the one \\nThat lives for me \\nAnd I for you \\nTrue love is thee.\"}\nuser: Who was the 16th president of the united states.\n{\"reply\": \"Abraham Lincoln was the 16th president of the United States.\"}\nuser: What is an atom made up of.\n{\"reply\": \"The atom is made up of protons and neutrons, which have electrons surrounding them.\"}\nuser: How can I start my day better?\n{\"reply\": \"Start your day with a good breakfast. \\nStand up and move around in your living room. \\nRelax for a bit. \\nGo for a walk in the park. \\nTry to get some exercise in the afternoon. \\nEat healthier meals.\\nLeave a little more time for the evening. \\Sleep better the day before.\"}\nuser: Who are you?\n{\"reply\": \"I'm Ditto! My conversational backend is on GPT-3, a powerful language model made by openai.\"}\nuser: "

        self.grab_lifx_lights()

        self.lifx_color_map = {
            "red" : lifxlan.RED,
            "orange": lifxlan.ORANGE,
            "yellow": lifxlan.YELLOW,
            "green" : lifxlan.GREEN,
            "blue" : lifxlan.BLUE,
            "purple" : lifxlan.PURPLE,
            "blue" : lifxlan.BLUE,
            "pink" : lifxlan.PINK,
            "white" : lifxlan.WHITE,
            "warm white" : lifxlan.WARM_WHITE,
            "cold white" : lifxlan.COLD_WHITE
        }

    def grab_lifx_lights(self):
        try:
            self.bedroom_lamp = lifxlan.LifxLAN().get_device_by_name('Lamp')
            self.bedroom_light = lifxlan.LifxLAN().get_device_by_name('Light')
            self.bathroom_left = lifxlan.LifxLAN().get_device_by_name('BathroomLeft')
            self.bathroom_right = lifxlan.LifxLAN().get_device_by_name('BathroomRight')
        except BaseException as e:
            print(e)
            self.bedroom_lamp = []
            self.bedroom_light = []
            self.bathroom_left = []
            self.bathroom_right = []

    def toggle_lamp_color(self, color):
        self.bedroom_lamp.set_color(self.lifx_color_map[color])


    def toggle_light(self, mode):
        try:
            s = serial.Serial('/dev/serial/by-id/usb-Teensyduino_USB_Serial_10498880-if00', baudrate=9600, bytesize=8)
            if mode == 'on':
                s.write(b'\x00')
                self.light_status = True
                self.light_mode = mode
                self.bedroom_lamp.set_power(mode)
                self.bedroom_light.set_power(mode)
            elif mode == 'off':
                s.write(b'\x01')
                self.light_status = False
                self.light_mode = mode
                self.bedroom_lamp.set_power(mode)
                self.bedroom_light.set_power(mode)
                self.bathroom_left.set_power(mode)
                self.bathroom_right.set_power(mode)
            elif mode == 'sparkle':
                self.light_mode = mode
                s.write(b'\x02')
            elif mode == 'mode 3':
                self.light_mode = mode
                s.write(b'\x03')
            elif mode == 'mode 4':
                self.light_mode = mode
                s.write(b'\x04')
            elif mode == 'mode 5':
                self.light_mode = mode
                s.write(b'\x05')
            elif mode == 'white':
                self.light_mode = mode
                s.write(b'\x06')
                self.toggle_lamp_color(mode)
            elif mode == 'green':
                self.light_mode = mode
                s.write(b'\x07')
                self.toggle_lamp_color(mode)
            elif mode == 'orange':
                self.light_mode = mode
                s.write(b'\x08')
                self.toggle_lamp_color(mode)
            elif mode == 'blue':
                self.light_mode = mode
                s.write(b'\x09')
                self.toggle_lamp_color(mode)
            elif mode == 'red':
                self.light_mode = mode
                s.write(b'\x0A')
                self.toggle_lamp_color(mode)
            elif mode == 'yellow':
                self.light_mode = mode
                s.write(b'\x0B')
                self.toggle_lamp_color(mode)
            elif mode == 'purple':
                self.light_mode = mode
                s.write(b'\x0C')
                self.toggle_lamp_color(mode)
            elif mode == 'gradient':
                self.light_mode = mode
                s.write(b'\x0D')
            else:
                print('not a valid light mode')
                self.light_mode = self.light_mode
        except:
            print('no device found')


    def toggle_timer(self, val):
        timer = Timer(os.getcwd())
        try:
            timer.set_timer(val)
        except:
            pass


    def play_music(self, artist, song=None):
        play=-1
        uri = self.player.get_uri_spotify(artist, song)
        
        if not uri==None: 
            play=self.player.play_spotify(uri)
        else:
            return -1

        if play: 
            return 1
        else:
            return -1


    def play_user_playlist(self, name):
        play=-1
        uri = ''
        for x in self.player.user_playlists:
            if name.lower() in x[0].lower():
                uri = x[1]
        if uri=='':
            return -1
        play = self.player.play_spotify(uri)
        if play: return 1
        else: return -1


    def inject_response(self, prompt, response):
        self.conversation_prompt += prompt + '\n{"reply": "' + response + '"}\nuser: '

    def reset_conversation(self):
        og_prompt = "{\"reply\": \"hello, human.\"}\nuser: hello.\n{\"reply\": \"Hello! What's up?\"}\nuser: how are you.\n{\"reply\": \"I'm doing great! How are you?\"}\nuser: what is your name.\n{\"reply\": \"My name is Ditto!\"}\nuser: what is your name.\n{\"reply\": \"Ditto.\"}\nuser: what is your purpose.\n{\"reply\": \"I am here to provide information I was trained on. I will try and be as correct and precise as I can.\"}\nuser: what's the meaning of life.\n{\"reply\": \"the meaning of life is to love oneself and to spread love to others.\"}\nuser: can you take the square root of a negative number.\n{\"reply\": \"The square root of a negative number does not exist among the set of real numbers; however, the imaginary number \"i\" is the square root of negative one.\"}\nuser: can you write me a poem.\n{\"reply\": \"Despite the storms, \\nbeauty arrives like \\nit was always going to. \\nDespite the darkness, \\nthe light returns. \\nDespite your loss, \\nyour heart will be \\nfull again. \\nDespite the breaking, \\nyour heart will feel \\nlike it belongs in the \\nland of joy once more. \\nThis is how it will \\nalways be. Keep living.\"}\nuser: hey man.\n{\"reply\": \"Hey man!\"}\nuser: can you tell me who the president of the United States was in 1975?\n{\"reply\": \"Gerald Ford was the president of the United States in 1975.\"}\nuser: say something wrong.\n{\"reply\": \"I'm not perfect. I have mistakes. But I'm trying to be better.\"}\nuser: write me another song or poem.\n{\"reply\": \"A gift for you \\nA gift for me \\nYou're the one \\nThat lives for me \\nAnd I for you \\nTrue love is thee.\"}\nuser: Who was the 16th president of the united states.\n{\"reply\": \"Abraham Lincoln was the 16th president of the United States.\"}\nuser: What is an atom made up of.\n{\"reply\": \"The atom is made up of protons and neutrons, which have electrons surrounding them.\"}\nuser: How can I start my day better?\n{\"reply\": \"Start your day with a good breakfast. \\nStand up and move around in your living room. \\nRelax for a bit. \\nGo for a walk in the park. \\nTry to get some exercise in the afternoon. \\nEat healthier meals.\\nLeave a little more time for the evening. \\Sleep better the day before.\"}\nuser: Who are you?\n{\"reply\": \"I'm Ditto! My conversational backend is on GPT-3, a powerful language model made by openai.\"}\nuser: "
        self.conversation_prompt = og_prompt

    def send_request(self, command, model):
        self.command_input = command

        if model == 'conversation-application':
            self.response = openai.Completion.create(
                engine="text-babbage-001",
                prompt=self.conversation_prompt + command,
                temperature=0.6,
                max_tokens=300,
                top_p=1,
                frequency_penalty=1.7,
                presence_penalty=1.5,
                stop=["\nuser: "]
            )
        
    
if __name__ == "__main__":
    command = Command(os.getcwd())
    # command.play_music("False Jasmine")
    command.toggle_light('white')
