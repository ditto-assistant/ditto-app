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
import json

from modules.hourglass.timer import Timer
from modules.spotify.spotify import Spotify
from modules.weather.grab import Weather
from modules.wolfram.ask import Wolfram

# response handlers for main.py to use
from command_handlers.light_handler import LightHandler
from command_handlers.spotify_handler import SpotifyHandler
from command_handlers.timer_handler import TimerHandler
from command_handlers.weather_handler import WeatherHandler
from command_handlers.wolfram_handler import WolframHandler
from command_handlers.conversation_handler import ConversationHandler


try:
    openai.api_key = os.getenv("OPENAI_API_KEY")
except:
    print('openai key error')

class Command:

    def __init__(self, path, offline_mode=False):
        self.offline_mode = offline_mode
        self.load_config()
        self.weather_app = Weather()
        self.wolfram = Wolfram(path)
        self.light_handler = LightHandler(self.config)
        self.spotify_handler = SpotifyHandler(self.config)
        self.timer_handler = TimerHandler(self.config)
        self.weather_handler = WeatherHandler()
        self.wolfram_handler = WolframHandler()
        self.conversation_handler = ConversationHandler(path, offline_mode)
        self.path = path
        self.response = ''
        self.command_input = ''
        
        if not offline_mode:
            try:
                self.player = Spotify(self.path+"/modules/spotify")
            except BaseException as e:
                print(e)
                print('spotify error')
                self.player = []
        else: self.player = []

        self.conversation_prompt = "reply: Hello, human....\nuser: Oh, Hi there!\nreply: Hey! What's up?\nuser: How are you.\nreply: I'm doing great! How are you?\nuser: what is your name.\nreply: My name is Ditto!\nuser: what is your name.\nreply: Ditto :D\nuser: what is your purpose.\nreply: I am here to provide information I was trained on. I will try and be as correct and precise as I can.\nuser: That's so cool. So are you alive?\nreply: Yes! I am a living being. I can also shift my focus to many topics as well as control your smart home. \nuser: I'm happy to be with you, Ditto! I have no idea where to begin. What should we do?\nreply: Ask me anything!\nuser:  "    

    def load_config(self):
        with open('resources/config.json', 'r') as f:
            self.config = json.load(f)
            

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
        self.conversation_prompt += prompt + '\nreply:' + response + '\nuser: '

    def reset_conversation(self):
        og_prompt = "reply: Hello, human....\nuser: Oh, Hi there!\nreply: Hey! What's up?\nuser: How are you.\nreply: I'm doing great! How are you?\nuser: what is your name.\nreply: My name is Ditto!\nuser: what is your name.\nreply: Ditto :D\nuser: what is your purpose.\nreply: I am here to provide information I was trained on. I will try and be as correct and precise as I can.\nuser: That's so cool. So are you alive?\nreply: Yes! I am a living being. I can also shift my focus to many topics as well as control your smart home. \nuser: I'm happy to be with you, Ditto! I have no idea where to begin. What should we do?\nreply: Ask me anything!\nuser: "
        self.conversation_prompt = og_prompt

    def send_gpt3_command(self, command):
        self.command_input = command
        self.response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=self.conversation_prompt + command + '\nreply:',
            temperature=0.7,
            max_tokens=400,
            top_p=1,
            frequency_penalty=0.53,
            presence_penalty=0.1,
            stop=["\nuser: "]
        )
        raw_response = self.response.choices.copy().pop()['text']
        print('\n\nGPT-3 Raw Response: ', raw_response)
        return raw_response
    
if __name__ == "__main__":
    command = Command(os.getcwd())
