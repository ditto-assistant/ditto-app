"""
Sends a prompt to a GPT-3 model.

author: Omar Barazanji

refs:
1) https://github.com/openai/openai-python

notes:
1) run the following for first time:
    $env:OPENAI_API_KEY="your-key-here"
"""

from lib2to3.pytree import Base
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

try:
    openai.api_key = os.getenv("OPENAI_API_KEY")
except:
    print('openai key error')

class Command:

    def __init__(self, path):
        self.load_config()
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
            print('spotify error')
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
            light_groups = self.config['light_groups']
            self.lifx_lights = []
            lights = lifxlan.LifxLAN().get_lights()
            
            for group in light_groups:
                for light in lights:
                    light_group = light.get_group()
                    if self.config['user'] in light_group:
                        self.lifx_lights.append(light)

        except BaseException as e:
            print(e)

    def set_light_brightness(self, value, light_name=None):
        if light_name==None:
            for light in self.lifx_lights:
                light.set_brightness(value)

        else:
            for light in self.lifx_lights:
                if light_name.lower() in light.get_label().lower():
                    light.set_brightness(value)

    def toggle_light_color(self, color, light_name=None):
        if light_name==None:
            for light in self.lifx_lights:
                if light.supports_color():
                    light.set_color(self.lifx_color_map[color])

        else:
            for light in self.lifx_lights:
                if light_name.lower() in light.get_label().lower():
                    if light.supports_color():
                        light.set_color(self.lifx_color_map[color])

    def load_config(self):
        with open('resources/config.json', 'r') as f:
            self.config = json.load(f)
            
    def toggle_light_power(self, mode, light_name=None):
        if light_name==None:
            for light in self.lifx_lights:
                print(light)
                light.set_power(mode)
        else:
            for light in self.lifx_lights:
                if light_name.lower() in light.get_label().lower():
                    light.set_power(mode)

    def toggle_light(self, mode):
        try:
            dev_path = self.config['teensy_path']
            try:
                s = serial.Serial(dev_path, baudrate=9600, bytesize=8)
            except BaseException as e:
                print(e)
            if mode == 'on':
                self.light_status = True
                self.light_mode = mode
                self.toggle_light_power(mode)
                s.write(b'\x00')
            elif mode == 'off':
                self.light_status = False
                self.light_mode = mode
                self.toggle_light_power(mode)
                s.write(b'\x01')
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
                self.toggle_light_color(mode)
            elif mode == 'green':
                self.light_mode = mode
                s.write(b'\x07')
                self.toggle_light_color(mode)
            elif mode == 'orange':
                self.light_mode = mode
                s.write(b'\x08')
                self.toggle_light_color(mode)
            elif mode == 'blue':
                self.light_mode = mode
                s.write(b'\x09')
                self.toggle_light_color(mode)
            elif mode == 'red':
                self.light_mode = mode
                s.write(b'\x0A')
                self.toggle_light_color(mode)
            elif mode == 'yellow':
                self.light_mode = mode
                s.write(b'\x0B')
                self.toggle_light_color(mode)
            elif mode == 'purple':
                self.light_mode = mode
                s.write(b'\x0C')
                self.toggle_light_color(mode)
            elif mode == 'gradient':
                self.light_mode = mode
                s.write(b'\x0D')
            else:
                print('not a valid light mode')
                self.light_mode = self.light_mode
        except BaseException as e:
            print(e)
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
