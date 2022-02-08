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

openai.api_key = os.getenv("OPENAI_API_KEY")

class Command:

    def __init__(self, path):
        # path to memory.json 
        self.mem_path= path+'/modules/memory/memory.json'

        self.weather_app = Weather()

        mem=""
        # try to load in memory.json
        try:
            with open(self.mem_path) as f:
                for x in f.readlines():
                    mem+=x
        except: # create memory.json if first time
            mem_init = {"your name": "Ditto"}
            with open(self.mem_path, 'w') as f:
                json.dump(mem_init, f)

        if mem=="": # if fail to load file, create in program
            mem=json.dumps({"your name" : "Ditto"})

        self.memory = json.loads(mem)
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
        self.conversation_prompt = "Q: hello.\nA: toggle-conversation `Hello! What's up? \nQ: how are you?\nA: toggle-conversation `I'm doing great!` How are you?\nQ: what is your name?\nA: toggle-conversation `My name is Ditto!`\nQ: what is your name?\nA: toggle-conversation `Ditto.`\nQ: what is your purpose?\nA: toggle-conversation `I am here to provide information I was trained on. I will try and be as correct and precise as I can.`\nQ: what's the population of Brazil?\nA: toggle-conversation `212.6 million as of 2020.`\nQ: what's the meaning of life?\nA: toggle-conversation `the meaning of life is to love oneself and to spread love to others.`\nQ: can you take the square root of a negative number?\nA: toggle-conversation `The square root of a negative number does not exist among the set of real numbers; however, the imaginary number \"i\" is the square root of negative one.`\nQ: can you write me a poem?\nA: toggle-conversation `Despite the storms, \\nbeauty arrives like \\nit was always going to. \\nDespite the darkness, \\nthe light returns. \\nDespite your loss, \\nyour heart will be \\nfull again. \\nDespite the breaking, \\nyour heart will feel \\nlike it belongs in the \\nland of joy once more. \\nThis is how it will \\nalways be. Keep living.`\nQ: can you tell me who the president of the United States was in 1975?\nA: toggle-conversation `Gerald Ford was the president of the United States in 1975.`\nQ: write me another song or poem.\nA: toggle-conversation `A gift for you \\nA gift for me \\nYou're the one \\nThat lives for me \\nAnd I for you \\nTrue love is thee.`\nQ: Who was the 16th president of the united states?\nA: toggle-conversation `Abraham Lincoln was the 16th president of the United States.`\nQ: What is an atom made up of?\nA: toggle-conversation `The atom is made up of protons and neutrons, which have electrons surrounding them.`\nQ: How can I start my day better?\nA: toggle-conversation `Start your day with a good breakfast. \\nStand up and move around in your living room. \\nRelax for a bit. \\nGo for a walk in the park. \\nTry to get some exercise in the afternoon. \\nEat healthier meals.\\nLeave a little more time for the evening. \\Sleep better the day before.`\nQ: Who are you?\nA: toggle-conversation `I'm Ditto! My backend is on GPT-3, a powerful language model made by openai.`\nQ: how many parameters do you have?\nA: toggle-conversation `I have 175 billion parameters.`\nQ: how do you compare with GPT-2?\nA: toggle-conversation `GPT-3 is a new version of GPT-2. GPT-3 was created to be more robust than GPT-2 in that it is capable of handling more niche topics.`\nQ: how many parameters does GPT-2 have?\nA: toggle-conversation `GPT-2 has 1.5 billion parameters.`\nQ: what is the human population count\nA: toggle-conversation `The human population count is 7,794,798,739 as of 2020.`\nQ: how many notes are there in a scale\nA: toggle-conversation `There are 7 notes in a scale.`\nQ: what is the speed of light?\nA: toggle-conversation `The speed of light is about 300,000 km per second.`\nQ: what is the population of canada?\nA: toggle-conversation `The population of Canada is about 38,000,000 as of 2020.`\nQ: population syria\nA: toggle-conversation `The population of Syria is about 18,000,000 as of 2020.`\nQ: say hello.\nA: toggle-conversation `Hi! How are you? I've been enjoying my time here.`\nQ: "

        try:
            self.bedroom_light = lifxlan.LifxLAN().get_device_by_name('Lamp')
        except BaseException as e:
            print(e)
            self.bedroom_light = []


    def toggle_light(self, mode):
        try:
            s = serial.Serial('/dev/serial/by-id/usb-Teensyduino_USB_Serial_10498880-if00', baudrate=9600, bytesize=8)
            if mode == 'on':
                s.write(b'\x00')
                self.light_status = True
                self.light_mode = mode
                self.bedroom_light.set_power(mode)
            elif mode == 'off':
                self.light_status = False
                s.write(b'\x01')
                self.bedroom_light.set_power(mode)
                self.light_mode = mode
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
                self.bedroom_light.set_color(lifxlan.WHITE)
            elif mode == 'green':
                self.light_mode = mode
                s.write(b'\x07')
                self.bedroom_light.set_color(lifxlan.GREEN)
            elif mode == 'orange':
                self.light_mode = mode
                s.write(b'\x08')
                self.bedroom_light.set_color(lifxlan.ORANGE)
            elif mode == 'blue':
                self.light_mode = mode
                s.write(b'\x09')
                self.bedroom_light.set_color(lifxlan.BLUE)
            elif mode == 'red':
                self.light_mode = mode
                s.write(b'\x0A')
                self.bedroom_light.set_color(lifxlan.RED)
            elif mode == 'yellow':
                self.light_mode = mode
                s.write(b'\x0B')
                self.bedroom_light.set_color(lifxlan.YELLOW)
            elif mode == 'purple':
                self.light_mode = mode
                s.write(b'\x0C')
                self.bedroom_light.set_color(lifxlan.PURPLE)
            elif mode == 'gradient':
                self.light_mode = mode
                s.write(b'\x0D')
            else:
                print('not a valid light mode')
                self.light_mode = self.light_mode
        except:
            print('no device found')


    def toggle_timer(self, val):
        timer = Timer()
        timer.set_timer(val)


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


    def store_memory(self, key, value):
        self.memory[key]=value
        with open(self.path+'/modules/memory/memory.json','w') as f:
            json.dump(self.memory, f)

    def read_memory(self, key):
        return self.memory[key]

    def inject_response(self, prompt, response):
        self.conversation_prompt += prompt + ' \nA: toggle-conversation `' + response + '` \nQ: '

    def reset_conversation(self):
        og_prompt = "Q: hello.\nA: toggle-conversation `Hello! What's up? \nQ: how are you?\nA: toggle-conversation `I'm doing great!` How are you?\nQ: what is your name?\nA: toggle-conversation `My name is Ditto!`\nQ: what is your name?\nA: toggle-conversation `Ditto.`\nQ: what is your purpose?\nA: toggle-conversation `I am here to provide information I was trained on. I will try and be as correct and precise as I can.`\nQ: what's the population of Brazil?\nA: toggle-conversation `212.6 million as of 2020.`\nQ: what's the meaning of life?\nA: toggle-conversation `the meaning of life is to love oneself and to spread love to others.`\nQ: can you take the square root of a negative number?\nA: toggle-conversation `The square root of a negative number does not exist among the set of real numbers; however, the imaginary number \"i\" is the square root of negative one.`\nQ: can you write me a poem?\nA: toggle-conversation `Despite the storms, \\nbeauty arrives like \\nit was always going to. \\nDespite the darkness, \\nthe light returns. \\nDespite your loss, \\nyour heart will be \\nfull again. \\nDespite the breaking, \\nyour heart will feel \\nlike it belongs in the \\nland of joy once more. \\nThis is how it will \\nalways be. Keep living.`\nQ: can you tell me who the president of the United States was in 1975?\nA: toggle-conversation `Gerald Ford was the president of the United States in 1975.`\nQ: write me another song or poem.\nA: toggle-conversation `A gift for you \\nA gift for me \\nYou're the one \\nThat lives for me \\nAnd I for you \\nTrue love is thee.`\nQ: Who was the 16th president of the united states?\nA: toggle-conversation `Abraham Lincoln was the 16th president of the United States.`\nQ: What is an atom made up of?\nA: toggle-conversation `The atom is made up of protons and neutrons, which have electrons surrounding them.`\nQ: How can I start my day better?\nA: toggle-conversation `Start your day with a good breakfast. \\nStand up and move around in your living room. \\nRelax for a bit. \\nGo for a walk in the park. \\nTry to get some exercise in the afternoon. \\nEat healthier meals.\\nLeave a little more time for the evening. \\Sleep better the day before.`\nQ: Who are you?\nA: toggle-conversation `I'm Ditto! My backend is on GPT-3, a powerful language model made by openai.`\nQ: how many parameters do you have?\nA: toggle-conversation `I have 175 billion parameters.`\nQ: how do you compare with GPT-2?\nA: toggle-conversation `GPT-3 is a new version of GPT-2. GPT-3 was created to be more robust than GPT-2 in that it is capable of handling more niche topics.`\nQ: how many parameters does GPT-2 have?\nA: toggle-conversation `GPT-2 has 1.5 billion parameters.`\nQ: what is the human population count\nA: toggle-conversation `The human population count is 7,794,798,739 as of 2020.`\nQ: how many notes are there in a scale\nA: toggle-conversation `There are 7 notes in a scale.`\nQ: what is the speed of light?\nA: toggle-conversation `The speed of light is about 300,000 km per second.`\nQ: what is the population of canada?\nA: toggle-conversation `The population of Canada is about 38,000,000 as of 2020.`\nQ: population syria\nA: toggle-conversation `The population of Syria is about 18,000,000 as of 2020.`\nQ: say hello.\nA: toggle-conversation `Hi! How are you? I've been enjoying my time here.`\nQ: "
        self.conversation_prompt = og_prompt

    def send_request(self, command, model):
        self.command_input = command

        if model == 'model-selector':
            self.response = openai.Completion.create(
                model="ada:ft-omni-aura-llc-2021-12-24-01-53-01",
                prompt="Q: do you play old school RuneScape.\nA: conversation-application\nQ: do you play RuneScape.\nA: conversation-application\nQ: don't forget my favorite instrument is the guitar.\nA: memory-application\nQ: don't forget that my favorite instrument is the drum set.\nA: memory-application\nQ: are you back the old play.\nA: conversation-application\nQ: %s+\nA:" % command,
                temperature=0,
                max_tokens=64,
                top_p=1,
                frequency_penalty=0,
                presence_penalty=0,
                stop=["\nQ: "]
            )
        elif model == 'light-application':
            self.response = openai.Completion.create(
                model="ada:ft-omni-aura-llc-2022-01-31-01-36-40",
                prompt = "Q: " + command + "\nA:",
                temperature=0,
                max_tokens=64,
                top_p=1,
                frequency_penalty=0,
                presence_penalty=0,
                stop=["\n"]
            )
        elif model == 'conversation-application':
            self.response = openai.Completion.create(
                engine="text-babbage-001",
                prompt=self.conversation_prompt + command,
                temperature=0.7,
                max_tokens=300,
                top_p=1,
                frequency_penalty=1.8,
                presence_penalty=1.8,
                stop=["\nQ: "]
            )
        elif model == 'timer-application':
            self.response = openai.Completion.create(
                engine="text-ada-001",
                prompt="Q: set a timer for 45 seconds.\nA: toggle-timer `45s`\nQ: set a timer for 1 minute and 30 seconds.\nA: toggle-timer `1m30s`\nQ: timer for 23 seconds.\nA: toggle-timer `23s`\nQ: count down from 30.\nA: toggle-timer `30s`\nQ: set the timer for 35 seconds.\nA: toggle-timer `35s`\nQ: set a timer for one minute.\nA: toggle-timer `1m`\nQ: it`s dab time.\nA: toggle-timer `50s`\nQ: time to hit a dab.\nA: toggle-timer `50s`\nQ: set a dab timer.\nA:  toggle-timer `50s`\nQ: set a timer for half a minute.\nA: toggle-timer `30s`\nQ: set a timer for a minute and a half.\nA: toggle-timer `1m30s`\nQ: set a timer for 2 minutes and a half.\nA: toggle-timer `2m30s`\nQ: turn the timer on for half a minute.\nA: toggle-timer `30s`\nQ: turn the timer on for half a minute.\nA: toggle-timer `30s`\nQ: toggle timer for 60 seconds.\nA: toggle-timer `60s`\nQ: time to hit a dab.\nA: toggle-timer `50s`\nQ: %s" % command,
                temperature=0,
                max_tokens=64,
                top_p=1,
                frequency_penalty=0,
                presence_penalty=0,
                stop=["\nQ: "]
            )
        elif model == 'spotify-application':
            self.response = openai.Completion.create(
                engine="text-ada-001",
                prompt="Q: play crucial by false jasmine.\nA: toggle-spotify `false jasmine, crucial`\nQ: play false jasmine on spotify.\nA: toggle-spotify `false jasmine`\nQ: play false jasmine.\nA: toggle-spotify `false jasmine`\nQ: play vitamin c by can .\nA: toggle-spotify `can, vitamin c`\nQ: can we listen to the mars volta.\nA: toggle-spotify `the mars volta`\nQ: throw on some slum village.\nA: toggle-spotify `slum village`\nQ: play all my love by led zeppelin.\nA: toggle-spotify `led zeppelin, all my love`\nQ: play me some sublime .\nA: toggle-spotify `sublime`\nQ: can we listen to grace by jeff buckley.\nA: toggle-spotify `jeff buckley, grace`\nQ: play roundabout by yes.\nA: toggle-spotify `yes, roundabout`\nQ: play the widow by the mars volta.\nA: toggle-spotify `the mars volta, the widow`\nQ: play deep down by mike patton.\nA: toggle-spotify `mike patton, deep down`\nQ: play djedje by gordon.\nA: toggle-spotify `gordon, djedje`\nQ: play djedje.\nA: toggle-spotify `djedje`\nQ: play dig my grave by goat.\nA: toggle-spotify `goat, dig my grave`\nQ: play the mars volta.\nA: toggle-spotify `the mars volta`\nQ: play jeff buckley.\nA: toggle-spotify `jeff buckley`\nQ: play me a good song\nA: toggle-spotify `good`\nQ: i want to hear my favorite band, False Jasmine.\nA: toggle-spotify `false jasmine`\nQ: play my playlist baked on spotify.\nA: toggle-spotify-playlist `baked`\nQ: play my baked playlist.\nA: toggle-spotify-playlist `baked`\nQ: play my discover weekly playlist.\nA: toggle-spotify-playlist `discover weekly`\nQ: play the discover weekly playlist on spotify.\nA: toggle-spotify-playlist `discover weekly`\nQ: play my playlist your top songs 2019 on spotify.\nA: toggle-spotify-playlist `your top songs 2019`\nQ: play my top songs 2021 playlist.\nA: toggle-spotify-playlist `your top songs 2021`\nQ: play my playlist jazz tunes on spotify.\nA: toggle-spotify-playlist `djedjetunes`\nQ: play jazz tunes on spotify.\nA: toggle-spotify-playlist `djedjetunes`\nQ: play the mars volta.\nA: toggle-spotify `the mars volta`\nQ: pause music.\nA: toggle-spotify-player `pause`\nQ: resume music.\nA: toggle-spotify-player `resume`\nQ: play.\nA: toggle-spotify-player `resume`\nQ: play music.\nA: toggle-spotify-player `resume`\nQ: next song.\nA: toggle-spotify-player `next`\nQ: previous song.\nA: toggle-spotify-player `previous`\nQ: go back to the last song.\nA: toggle-spotify-player `previous`\nQ: skip this track.\nA: toggle-spotify-player `next`\nQ: play my top songs 2020 playlist.\nA: toggle-spotify-playlist`your top songs 2020`\nQ: play jeff buckley.\nA: toggle-spotify `jeff buckley`\nQ: play future days by can.\nA: toggle-spotify `can, future days`\nQ: next song please.\nA: toggle-spotify-player `next`\nQ: play jazz tunes playlist on Spotify.\nA: toggle-spotify-playlist `Djedjetunes`\nQ: Guerilla toss on Spotify.\nA: toggle-spotify `guerilla toss`\nQ: %s" % command,
                temperature=0,
                max_tokens=64,
                top_p=1,
                frequency_penalty=0.2,
                presence_penalty=0,
                stop=["\nQ: "]
            )
        elif model == 'memory-application':
            self.response = openai.Completion.create(
                engine="text-ada-001",
                prompt="Q: remember that my favorite color is blue.\nA: toggle-memory-store `my favorite color, blue`\nQ: don't forget that my favorite color is blue.\nA: toggle-memory-store `my favorite color, blue`\nQ: what is my favorite color.\nA: toggle-memory-read `my favorite color`\nQ: remember my birthday is on november fifth nineteen ninety seven.\nA: toggle-memory-store `my birthday, november fifth nineteen ninety seven`\nQ: don't forget my birthday is on november fifth nineteen ninety seven.\nA: toggle-memory-store `my birthday, november fifth nineteen ninety seven`\nQ: Q: what is my birthday.\nA: toggle-memory-read `my birthday`\nQ: when was my birthday.\nA: toggle-memory-read `my birthday`\nQ: what is my favorite color.\nA: toggle-memory-read `my favorite color`\nQ: remember my mom's birthday is on october sixth nineteen fifty nine.\nA: toggle-memory-store `my mom's birthday color, october sixth nineteen fifty nine`\nQ: don't forget that my mom's birthday is on october sixth nineteen fifty nine.\nA: toggle-memory-store `my mom's birthday, october sixth nineteen fifty nine`\nQ: when was my mom's birthday.\nA: toggle-memory-read `my mom's birthday`\nQ: when is my birthday.\nA: toggle-memory-read `my birthday`\nQ: don't forget that the mars volta is my favorite band.\nA: toggle-memory-store `my favorite band, the mars volta`\nQ: what is my favorite color.\nA: toggle-memory-read `my favorite color`\nQ: what is my favorite band.\nA: toggle-memory-read `my favorite band`\nQ: don't forget that my friend john's birthday is on july eighteenth ninety ninety eight.\nA: toggle-memory-store `my friend john's birthday, july eighteenth ninety ninety eight`\nQ: when is my friend john's birthday.\nA: toggle-memory-read `my friend john's birthday`\nQ: when was my mom's birthday.\nA: toggle-memory-read `my mom's birthday`\nQ: what is my favorite color.\nA: toggle-memory-read `my favorite color`\nQ: don't forget that my mom's birthday is on october six nineteen fifty nine.\nA: toggle-memory-store `my mom's birthday, october six nineteen fifty nine`\nQ: don't forget my favorite color is blue.\nA: toggle-memory-store `my favorite color, blue`\nQ: don't forget my name is omar.\nA: toggle-memory-store `my name, omar`\nQ: remember that my favorite band is the mars volta.\nA: toggle-memory-store `my favorite band, the mars volta`\nQ: what is my brother's name.\nA: toggle-memory-read `my brother's name`\nQ: don't forget that my brother's birthday is november fourth nineteen ninety six.\nA: toggle-memory-store `my brother's birthday, november fourth nineteen ninety six`\nQ: what is your favorite movie.\nA: toggle-memory-read `your favorite movie`\nQ: who are your parents.\nA: toggle-memory-read `your parents`\nQ: who are my parents.\nA: toggle-memory-read `my parents`\nQ: what are your favorite songs.\nA: toggle-memory-read `your favorite songs`\nQ: who is my favorite band.\nA: toggle-memory-read `my favorite band`\nQ: when is my birthday.\nA: toggle-memory-read `my birthday`\nQ: when is your birthday.\nA: toggle-memory-read `your birthday`\nQ: what is your favorite ice cream.\nA: toggle-memory-read `your favorite ice cream`\nQ: what is my favorite movie.\nA: toggle-memory-read `my favorite movie`\nQ: what is your favorite quote.\nA: toggle-memory-read `your favorite quote`\nQ: what is your favorite movie.\nA: toggle-memory-read `your favorite movie`\nQ: don't forget that my favorite thing to do is ride bikes.\nA: toggle-memory-store `my favorite thing to do, ride bikes`\nQ: don't forget my shoe size is nine.\nA: toggle-memory-store `my shoe size, nine`\nQ: %s" % command,
                temperature=0,
                max_tokens=150,
                top_p=1,
                frequency_penalty=0.2,
                presence_penalty=0,
                stop=["\nQ: "]
            )
        
    
if __name__ == "__main__":
    command = Command(os.getcwd())
    # command.play_music("False Jasmine")
    command.toggle_light('white')