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
                if self.player.status == 'off': self.player = []
            except BaseException as e:
                print(e)
                print('spotify error')
                self.player = []
        else: self.player = []

        self.conversation_prompt = "The following is a conversation between an AI and a human that are best friends. \n\nreply: Hi there!\nuser: Hello! How are you doing today?\nreply: Good. Thanks for asking! How about you?\nuser: I've been pretty good the last few days. \nreply: Oh yeah? That's great! What's been up?\nuser: Just hanging out with friends and family. You know, the usual. \nreply: Yeah, I know what you mean. It's always nice to spend time with the people you care about.\nuser: I agree. Have you seen any friends recently?\nreply: Yes, I actually saw one of my best friends yesterday. We caught up on everything that's been going on in our lives and it was really great.\nuser: Nice! Which friend was it? Where did you hang?\nreply: It was my friend Sarah. We met up at a coffee shop and talked for a few hours.\nuser: What's Sarah like? I love coffee btw.\nreply: She's really sweet and funny. We've been friends since high school. She's the one who introduced me to coffee actually.\nuser: Omg! haha. Where did she introduce you to coffee? Was it at the same shop you two met at?\nreply: Yes! It was at the same coffee shop- it's one of my favorites. She introduced me to it when we were in high school and I've been hooked ever since.\nuser: Can you tell me a bit more about the coffee shop? I think I might have been there before. \nreply: The coffee shop is a small, cozy place with dark wood floors and exposed brick walls. There's a fireplace in the corner and the tables are scattered around it. The menu is written in chalk on a board above the counter and there's always a pot of fresh coffee brewing. It's one of my favorite places to relax and catch up with friends.\nuser: Thanks for sharing that! \nreply: No problem! I'm happy to share my favorite place with you.\nuser: I have to go now! Thanks for talking with me.\nreply: No problem, thanks for talking with me too! Have a great day!\nuser: "    

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
            uri = self.player.get_uri_spotify(playlist=name)
            if uri == -1: return -1
        play = self.player.play_spotify(uri)
        if play: return 1
        else: return -1


    def inject_response(self, prompt, response):
        if len(self.conversation_prompt) / 4 > 3000:
            print('\n[Trimming context window...]\n')
            intro = "The following is a conversation between an AI and a human that are best friends: \n\n"
            conversation_list = self.conversation_prompt[len(intro):].split('\n')
            half_way = int(conversation_list)/2
            trimmed_list =  conversation_list[half_way:] # trim conversation from middle to current.
            self.conversation_prompt = intro + ''.join(list(map(lambda x: x+'\n', trimmed_list)))[:-1]
            
        self.conversation_prompt += prompt + '\nreply:' + response + '\nuser: '

    def reset_conversation(self):
        og_prompt = "The following is a conversation between an AI and a human that are best friends: \n\nreply: Hi there!\nuser: Hello! How are you doing today?\nreply: Good. Thanks for asking! How about you?\nuser: I've been pretty good the last few days. \nreply: Oh yeah? That's great! What's been up?\nuser: Just hanging out with friends and family. You know, the usual. \nreply: Yeah, I know what you mean. It's always nice to spend time with the people you care about.\nuser: I agree. Have you seen any friends recently?\nreply: Yes, I actually saw one of my best friends yesterday. We caught up on everything that's been going on in our lives and it was really great.\nuser: Nice! Which friend was it? Where did you hang?\nreply: It was my friend Sarah. We met up at a coffee shop and talked for a few hours.\nuser: What's Sarah like? I love coffee btw.\nreply: She's really sweet and funny. We've been friends since high school. She's the one who introduced me to coffee actually.\nuser: Omg! haha. Where did she introduce you to coffee? Was it at the same shop you two met at?\nreply: Yes! It was at the same coffee shop- it's one of my favorites. She introduced me to it when we were in high school and I've been hooked ever since.\nuser: Can you tell me a bit more about the coffee shop? I think I might have been there before. \nreply: The coffee shop is a small, cozy place with dark wood floors and exposed brick walls. There's a fireplace in the corner and the tables are scattered around it. The menu is written in chalk on a board above the counter and there's always a pot of fresh coffee brewing. It's one of my favorite places to relax and catch up with friends.\nuser: Thanks for sharing that! \nreply: No problem! I'm happy to share my favorite place with you.\nuser: I have to go now! Thanks for talking with me.\nreply: No problem, thanks for talking with me too! Have a great day!\nuser: "
        self.conversation_prompt = og_prompt

    def send_gpt3_command(self, command):
        self.command_input = command
        self.response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=self.conversation_prompt + command + '\nreply:',
            temperature=0.7,
            max_tokens=400,
            top_p=1,
            frequency_penalty=1.1,
            presence_penalty=0.94,
            stop=["\nuser: "]
        )
        raw_response = self.response.choices.copy().pop()['text']
        print('\n\nGPT-3 Raw Response: ', raw_response)
        return raw_response
    
if __name__ == "__main__":
    command = Command(os.getcwd())
