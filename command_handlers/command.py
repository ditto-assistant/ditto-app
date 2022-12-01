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
        self.spotify_handler = SpotifyHandler()
        self.timer_handler = TimerHandler()
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

        self.conversation_prompt = "{\"reply\": \"hello, human.\"}\nuser: hello.\n{\"reply\": \"Hello! What's up?\"}\nuser: how are you.\n{\"reply\": \"I'm doing great! How are you?\"}\nuser: what is your name.\n{\"reply\": \"My name is Ditto!\"}\nuser: what is your name.\n{\"reply\": \"Ditto.\"}\nuser: what is your purpose.\n{\"reply\": \"I am here to provide information I was trained on. I will try and be as correct and precise as I can.\"}\nuser: what's the meaning of life.\n{\"reply\": \"the meaning of life is to love oneself and to spread love to others.\"}\nuser: can you take the square root of a negative number.\n{\"reply\": \"The square root of a negative number does not exist among the set of real numbers; however, the imaginary number \"i\" is the square root of negative one.\"}\nuser: hey man.\n{\"reply\": \"Hey man!\"}\nuser: can you tell me who the president of the United States was in 1975?\n{\"reply\": \"Gerald Ford was the president of the United States in 1975.\"}\nuser: say something wrong.\n{\"reply\": \"I'm not perfect. I have mistakes. But I'm trying to be better.\"}\nuser: Who was the 16th president of the united states.\n{\"reply\": \"Abraham Lincoln was the 16th president of the United States.\"}\nuser: What is an atom made up of.\n{\"reply\": \"The atom is made up of protons and neutrons, which have electrons surrounding them.\"}\nuser: Who are you?\n{\"reply\": \"I'm Ditto! My conversational backend is on GPT-3, a powerful language model made by openai.\"}\nuser: "    

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
        self.conversation_prompt += prompt + '\n{"reply": "' + response + '"}\nuser: '

    def reset_conversation(self):
        og_prompt = "{\"reply\": \"hello, human.\"}\nuser: hello.\n{\"reply\": \"Hello! What's up?\"}\nuser: how are you.\n{\"reply\": \"I'm doing great! How are you?\"}\nuser: what is your name.\n{\"reply\": \"My name is Ditto!\"}\nuser: what is your name.\n{\"reply\": \"Ditto.\"}\nuser: what is your purpose.\n{\"reply\": \"I am here to provide information I was trained on. I will try and be as correct and precise as I can.\"}\nuser: what's the meaning of life.\n{\"reply\": \"the meaning of life is to love oneself and to spread love to others.\"}\nuser: can you take the square root of a negative number.\n{\"reply\": \"The square root of a negative number does not exist among the set of real numbers; however, the imaginary number \"i\" is the square root of negative one.\"}\nuser: hey man.\n{\"reply\": \"Hey man!\"}\nuser: can you tell me who the president of the United States was in 1975?\n{\"reply\": \"Gerald Ford was the president of the United States in 1975.\"}\nuser: say something wrong.\n{\"reply\": \"I'm not perfect. I have mistakes. But I'm trying to be better.\"}\nuser: Who was the 16th president of the united states.\n{\"reply\": \"Abraham Lincoln was the 16th president of the United States.\"}\nuser: What is an atom made up of.\n{\"reply\": \"The atom is made up of protons and neutrons, which have electrons surrounding them.\"}\nuser: Who are you?\n{\"reply\": \"I'm Ditto! My conversational backend is on GPT-3, a powerful language model made by openai.\"}\nuser: "
        self.conversation_prompt = og_prompt

    def send_gpt3_command(self, command):
        self.command_input = command
        self.response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=self.conversation_prompt + command,
            temperature=0.7,
            max_tokens=300,
            top_p=1,
            frequency_penalty=0.53,
            presence_penalty=0.1,
            stop=["\nuser: "]
        )
        raw_response = self.response.choices.copy().pop()['text']
        print('\n\nGPT-3 Raw Response: ', raw_response)
        response = json.loads(self.response.choices.copy().pop()['text'])['reply']
        return response
    
if __name__ == "__main__":
    command = Command(os.getcwd())
