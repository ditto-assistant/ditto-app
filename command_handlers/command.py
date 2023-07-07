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
import time
import openai
import json
import requests

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
from command_handlers.soundscapes_handler import SoundScapesHandler

from datetime import datetime

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
        self.soundscapes_handler = SoundScapesHandler(path=path)
        self.path = path
        self.response = ''
        self.command_input = ''
        self.conversation_memory_buffer = []

        if not offline_mode:
            try:
                self.player = Spotify(self.path+"/modules/spotify")
                if self.player.status == 'off':
                    self.player = []
            except BaseException as e:
                print(e)
                print('spotify error')
                self.player = []
        else:
            self.player = []

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
        play = -1
        uri = self.player.get_uri_spotify(artist, song)

        if not uri == None:
            play = self.player.play_spotify(uri)
        else:
            return -1

        if play:
            return 1
        else:
            return -1

    def play_user_playlist(self, name):
        play = -1
        uri = ''
        for x in self.player.user_playlists:
            if name.lower() in x[0].lower():
                uri = x[1]
        if uri == '':
            uri = self.player.get_uri_spotify(playlist=name)
            if uri == -1:
                return -1
        play = self.player.play_spotify(uri)
        if play:
            return 1
        else:
            return -1

    def reset_conversation(self):
        self.conversation_memory_buffer = []
        # try:
        #     ip = self.config['nlp-server']
        #     requests.post(f'http://{ip}:32032/prompt/?reset=1', timeout=30)
        # except BaseException as e:
        #     print(e)

    def prompt_ditto_memory_agent(self, query):
        res = ''
        query_with_short_term_memory = query
        stamp = str(datetime.utcfromtimestamp(time.time()))
        if len(self.conversation_memory_buffer) > 1:
            query_with_short_term_memory = 'Short Term Memory Buffer:\n'
            for q, r, s in self.conversation_memory_buffer:
                query_with_short_term_memory += f'User ({s}): '+q+'\n'
                query_with_short_term_memory += f'AI: '+r+'\n'
        try:
            ip = self.config['nlp-server']
            res = requests.post(
                f'http://{ip}:32032/prompt/?prompt={query_with_short_term_memory}', timeout=30)
            res = str(res.content.decode().strip())
            print('\nA: ', res+'\n')
            self.conversation_memory_buffer.append((query, res, stamp))
            if len(self.conversation_memory_buffer) > 5:
                self.conversation_memory_buffer = self.conversation_memory_buffer[1:]

        except BaseException as e:
            print(e)
            res = '[Error communicating with OpenAI... Please try again!]'
        return res


if __name__ == "__main__":
    command = Command(os.getcwd())
