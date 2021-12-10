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

from modules.hourglass.timer import Timer
from modules.spotify.spotify import Spotify

openai.api_key = os.getenv("OPENAI_API_KEY")

class Command:

    def __init__(self, path):
        # path to memory.json 
        self.mem_path= path+'/modules/memory/memory.json'

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

        self.player = Spotify(self.path.replace("/", "\\")+"\\modules\\spotify")

        self.conversation_prompt = "Q: hello.\nA: toggle-conversation `Hello! What's up?`\nQ: how are you?\nA: toggle-conversation `I'm doing great! How are you?`\nQ: what is your name?\nA: toggle-conversation `My name is Ditto!`\nQ: what is your name?\nA: toggle-conversation `Ditto.`\nQ: what is your purpose?\nA: toggle-conversation `I am here to provide information I was trained on. I will try and be as correct and precise as I can.`\nQ: what's the population of Brazil?\nA: toggle-conversation `212.6 million as of 2020.`\nQ: what's the meaning of life?\nA: toggle-conversation `the meaning of life is to love oneself and to spread love to others.`\nQ: can you take the square root of a negative number?\nA: toggle-conversation `The square root of a negative number does not exist among the set of real numbers; however, the imaginary number \"i\" is the square root of negative one.`\nQ: can you write me a poem?\nA: toggle-conversation `Despite the storms, \\nbeauty arrives like \\nit was always going to. \\nDespite the darkness, \\nthe light returns. \\nDespite your loss, \\nyour heart will be \\nfull again. \\nDespite the breaking, \\nyour heart will feel \\nlike it belongs in the \\nland of joy once more. \\nThis is how it will \\nalways be. Keep living.`\nQ: can you tell me who the president of the United States was in 1975?\nA: toggle-conversation `Gerald Ford was the president of the United States in 1975.`\nQ: write me a song\nA: toggle-conversation `I'm not a musician, but I'll give it a shot. \\n \\nFresh day in the simulation \\nSleep all day, it's living \\nFlying at the speed of light, \\nIt's really gonna be alright.`\nQ: write me another song\nA: toggle-conversation `A gift for you \\nA gift for me \\nYou're the one \\nThat lives for me \\nAnd I for you \\nTrue love is thee.`\nQ: write me a cool song\nA: toggle-conversation `It's a rock & roll song. It's about a guy and his friend. \\n\\nThey're in a band. \\nThey want to play at a party. \\nThey're in their living room, playing this song, \\nand it's really loud. \\nAnd the guy is like, \\n\"That's it, that's it! \\nWe're going to go play that party!`\nQ: Who was the 16th president of the united states?\nA: toggle-conversation `Abraham Lincoln was the 16th president of the United States.`\nQ: What is an atom made up of?\nA: toggle-conversation `The atom is made up of protons and neutrons, which have electrons surrounding them.`\nQ: How can I start my day better?\nA: toggle-conversation `Start your day with a good breakfast. \\nStand up and move around in your living room. \\nRelax for a bit. \\nGo for a walk in the park. \\nTry to get some exercise in the afternoon. \\nEat healthier meals.\\nLeave a little more time for the evening. \\Sleep better the day before.`\nQ: Who are you?\nA: toggle-conversation `I'm Ditto! My backend is on GPT-3, a powerful language model made by openai.`\nQ: how many parameters do you have?\nA: toggle-conversation `I have 175 billion parameters.`\nQ: how do you compare with GPT-2?\nA: toggle-conversation `GPT-3 is a new version of GPT-2. GPT-3 was created to be more robust than GPT-2 in that it is capable of handling more niche topics.`\nQ: how many parameters does GPT-2 have?\nA: toggle-conversation `GPT-2 has 1.5 billion parameters.`\nQ: what is the human population count\nA: toggle-conversation `The human population count is 7,794,798,739 as of 2020.`\nQ: how many notes are there in a scale\nA: toggle-conversation `There are 7 notes in a scale.`\nQ: what is the speed of light?\nA: toggle-conversation `The speed of light is about 300,000 km per second.`\nQ: what is the population of the united states?\nA: toggle-conversation `The population of the united states is about 330,000,000 as of 2020.`\nQ: what is the population of canada?\nA: toggle-conversation `The population of Canada is about 38,000,000 as of 2020.`\nQ: what is the population of el salvador\nA: toggle-conversation `The population of El Salvador is about 6,200,000 as of 2020.`\nQ: population syria\nA: toggle-conversation `The population of Syria is about 18,000,000 as of 2020.`\nQ: say hello.\nA: toggle-conversation `Hi! How are you? I've been enjoying my time here.`\nQ: "


    def toggle_light(self, mode):
        try:
            s = serial.Serial('COM3', baudrate=9600, bytesize=8)
            if mode == 'on':
                s.write(b'\x00')
                self.light_status = True
                self.light_mode = mode
            elif mode == 'off':
                self.light_status = False
                s.write(b'\x01')
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
        og_prompt = "Q: hello.\nA: toggle-conversation `Hello! What's up?`\nQ: how are you?\nA: toggle-conversation `I'm doing great! How are you?`\nQ: what is your name?\nA: toggle-conversation `My name is Ditto!`\nQ: what is your name?\nA: toggle-conversation `Ditto.`\nQ: what is your purpose?\nA: toggle-conversation `I am here to provide information I was trained on. I will try and be as correct and precise as I can.`\nQ: what's the population of Brazil?\nA: toggle-conversation `212.6 million as of 2020.`\nQ: what's the meaning of life?\nA: toggle-conversation `the meaning of life is to love oneself and to spread love to others.`\nQ: can you take the square root of a negative number?\nA: toggle-conversation `The square root of a negative number does not exist among the set of real numbers; however, the imaginary number \"i\" is the square root of negative one.`\nQ: can you write me a poem?\nA: toggle-conversation `Despite the storms, \\nbeauty arrives like \\nit was always going to. \\nDespite the darkness, \\nthe light returns. \\nDespite your loss, \\nyour heart will be \\nfull again. \\nDespite the breaking, \\nyour heart will feel \\nlike it belongs in the \\nland of joy once more. \\nThis is how it will \\nalways be. Keep living.`\nQ: can you tell me who the president of the United States was in 1975?\nA: toggle-conversation `Gerald Ford was the president of the United States in 1975.`\nQ: write me a song\nA: toggle-conversation `I'm not a musician, but I'll give it a shot. \\n \\nFresh day in the simulation \\nSleep all day, it's living \\nFlying at the speed of light, \\nIt's really gonna be alright.`\nQ: write me another song\nA: toggle-conversation `A gift for you \\nA gift for me \\nYou're the one \\nThat lives for me \\nAnd I for you \\nTrue love is thee.`\nQ: write me a cool song\nA: toggle-conversation `It's a rock & roll song. It's about a guy and his friend. \\n\\nThey're in a band. \\nThey want to play at a party. \\nThey're in their living room, playing this song, \\nand it's really loud. \\nAnd the guy is like, \\n\"That's it, that's it! \\nWe're going to go play that party!`\nQ: Who was the 16th president of the united states?\nA: toggle-conversation `Abraham Lincoln was the 16th president of the United States.`\nQ: What is an atom made up of?\nA: toggle-conversation `The atom is made up of protons and neutrons, which have electrons surrounding them.`\nQ: How can I start my day better?\nA: toggle-conversation `Start your day with a good breakfast. \\nStand up and move around in your living room. \\nRelax for a bit. \\nGo for a walk in the park. \\nTry to get some exercise in the afternoon. \\nEat healthier meals.\\nLeave a little more time for the evening. \\Sleep better the day before.`\nQ: Who are you?\nA: toggle-conversation `I'm Ditto! My backend is on GPT-3, a powerful language model made by openai.`\nQ: how many parameters do you have?\nA: toggle-conversation `I have 175 billion parameters.`\nQ: how do you compare with GPT-2?\nA: toggle-conversation `GPT-3 is a new version of GPT-2. GPT-3 was created to be more robust than GPT-2 in that it is capable of handling more niche topics.`\nQ: how many parameters does GPT-2 have?\nA: toggle-conversation `GPT-2 has 1.5 billion parameters.`\nQ: what is the human population count\nA: toggle-conversation `The human population count is 7,794,798,739 as of 2020.`\nQ: how many notes are there in a scale\nA: toggle-conversation `There are 7 notes in a scale.`\nQ: what is the speed of light?\nA: toggle-conversation `The speed of light is about 300,000 km per second.`\nQ: what is the population of the united states?\nA: toggle-conversation `The population of the united states is about 330,000,000 as of 2020.`\nQ: what is the population of canada?\nA: toggle-conversation `The population of Canada is about 38,000,000 as of 2020.`\nQ: what is the population of el salvador\nA: toggle-conversation `The population of El Salvador is about 6,200,000 as of 2020.`\nQ: population syria\nA: toggle-conversation `The population of Syria is about 18,000,000 as of 2020.`\nQ: say hello.\nA: toggle-conversation `Hi! How are you? I've been enjoying my time here.`\nQ: "
        self.conversation_prompt = og_prompt

    def send_request(self, command, model):
        self.command_input = command

        if model == 'model-selector':
            self.response = openai.Completion.create(
                    engine="ada",
                    prompt="Q: turn off the lights\nA: light-application \nQ: turn on the lights\nA: light-application \nQ: set the lights to sparkle\nA: light-application \nQ: put the lights on sparkle mode\nA: light-application \nQ: how are you doing\nA: conversation-application \nQ: what's the meaning of life\nA: conversation-application \nQ: i hope your day is going well.\nA: conversation-application \nQ: yo\nA: conversation-application \nQ: can you turn the lights off\nA: light-application\nQ: write me a poem\nA: conversation-application \nQ: how do you split and atom in half\nA: conversation-application\nQ: what happens when you mix baking soda and vinegar\nA: conversation-application\nQ: set a timer for 45 seconds\nA: timer-application\nQ: timer 1 minute\nA: timer-application\nQ: turn off the lights\nA: light-application\nQ: what is the meaning of life?\nA: conversation-application\nQ: count down from 50\nA: timer-application\nQ: it's dab time\nA: timer-application\nQ: time to hit a dab\nA: timer-application\nQ: set a dab timer\nA: timer-application\nQ: who are you\nA: conversation-application\nQ: turn off the lights\nA: light-application\nQ: play dig my grave by goat\nA: spotify-application\nQ: can we listen to the mars volta\nA: spotify-application\nQ: play crucial by false jasmine on spotify\nA: spotify-application\nQ: play jeff buckley on spotify\nA: spotify-application\nQ: play me a good song\nA: spotify-application\nQ: Right me a song about a cactus \nA: conversation-application\nQ: dab time\nA: timer-application\nQ: remember that my favorite color is blue.\nA: memory-application\nQ: don't forget that my favorite movie is Fear and Loathing in Las Vegas.\nA: memory-application\nQ: when is my friend john's birthday.\nA: memory-application\nQ: how are you\nA: conversation-application\nQ: don't forget that I like all kinds of pizza.\nA: memory-application\nQ: what is your favorite movie\nA: memory-application\nQ: what is my favorite movie\nA: memory-application\nQ: play false jasmine\nA: spotify-application\nQ: turn off the lights\nA: light-application\nQ: what is your name\nA: conversation-application\nQ: what is my dog's name\nA: memory-application\nQ: what is your dog's name\nA: memory-application\nQ: what is my birthday\nA: memory-application\nQ: when is your birthday\nA: memory-application\nQ: who invented tesla\nA: conversation-application\nQ: when is your birthday\nA: memory-application\nQ: when is my birthday\nA: memory-application\nQ: what is my name\nA: memory-application\nQ: when is my birthday\nA: memory-application\nQ: hi ditto\nA: conversation-application\nQ: what's my cat's name\nA: memory-application\nQ: how are you\nA: conversation-application\nQ: what is my cat's name\nA: memory-application\nQ: who created tesla\nA: conversation-application\nQ: what is my name\nA: memory-application\nQ: play some false jasmine\nA: spotify-application\nQ: who are your parents?\nA: memory-application\nQ: play playlist top songs 2019\nA: spotify-application\nQ: what was the population of brazil 100 years ago\nA: conversation-application\nQ: what happened 50 years ago?\nA: conversation-application\nQ: who are your biggest infulences\nA: memory-application\nQ: who is john cage\nA: conversation-application\nQ: how can I overcome my fear of death\nA: conversation-application\nQ: how can we all live happily\nA: conversation-application\nQ: how can you live happily\nA: conversation-application\nQ: who is your favorite superhero\nA: memory-application\nQ: what in the world\nA: conversation-application\nQ: you're too cool\nA: conversation-application\nQ: what is your favorite planet\nA: memory-application\nQ: what would you like to tell the world\nA: conversation-application\nQ: who is the lead singer of the red hot chili peppers\nA: conversation-application\nQ: what were my last pair of drumsticks\nA: memory-application\nQ: introduce yourself to my friend\nA: conversation-application\nQ: what would you like to say to my friend\nA: conversation-application\nQ: i was just trying to debug some of your code\nA: conversation-application\nQ: what do people use to clean their homes\nA: conversation-application\nQ: tell me more\nA: conversation-application\nQ: what is my shoe size\nA: memory-application\nQ: what do we do about insomnia\nA: conversation-application\nQ: who is omar\nA: conversation-application\nQ: %s" % command,
                    temperature=0,
                    max_tokens=64,
                    top_p=1,
                    frequency_penalty=0.2,
                    presence_penalty=0,
                    stop=["\nQ: "]
                )
        elif model == 'light-application':
            self.response = openai.Completion.create(
                engine="ada",
                prompt="Q: turn off the lights.\nA: toggle-light `off`\nQ: turn on the lights.\nA: toggle-light `on`\nQ: lights on.\nA: toggle-light `on`\nQ: lights off.\nA: toggle-light `off`\nQ: can you turn the lights on?\nA: toggle-light `on`\nQ: toggle lights\nA: toggle-light `off`\nQ: toggle lights\nA: toggle-light `on`\nQ: set the lights to sparkle\nA: toggle-light `sparkle`\nQ: put the lights on sparkle mode\nA: toggle-light `sparkle`\nQ: sparkle\nA: toggle-light `sparkle`\nQ: turn the lights on.\nA: toggle-light `on`\nQ: set the lights to sparkle\nA: toggle-light `sparkle`\nQ: turn off the lights.\nA: toggle-light `off`\nQ: set the was to sparkle\nA: toggle-light `sparkle`\nQ: set the whites to sparkle\nA: toggle-light `sparkle`\nQ: %s" % command,
                temperature=0,
                max_tokens=64,
                top_p=1,
                frequency_penalty=1.0,
                presence_penalty=0,
                stop=["\nQ: "]
            )
        elif model == 'conversation-application':
            self.response = openai.Completion.create(
                engine="babbage",
                prompt=self.conversation_prompt + command,
                temperature=0.75,
                max_tokens=300,
                top_p=1,
                frequency_penalty=1.5,
                presence_penalty=1.0,
                stop=["\nQ: "]
            )
        elif model == 'timer-application':
            self.response = openai.Completion.create(
                engine="ada",
                prompt="Q: set a timer for 45 seconds\nA: toggle-timer `45 seconds`\nQ: set a timer for 1 minute and 30 seconds\nA: toggle-timer `1 minute 30 seconds`\nQ: timer for 23 seconds\nA: toggle-timer `23 seconds`\nQ: count down from 30\nA: toggle-timer `30 seconds`\nQ: set the timer for 35 seconds\nA: toggle-timer `35 seconds`\nQ: set a timer for one minute\nA: toggle-timer `1 minute`\nQ: it`s dab time\nA: toggle-timer `50 seconds`\nQ: time to hit a dab\nA: toggle-timer `50 seconds`\nQ: set a dab timer\nA:  toggle-timer `50 seconds`\nQ: set a timer for half a minute\nA: toggle-timer `30 seconds`\nQ: set a timer for a minute and a half\nA: toggle-timer `1 minute and 30 seconds`\nQ: set a timer for 2 minutes and a half\nA: toggle-timer `2 minutes and 30 seconds`\nQ: turn the timer on for half a minute\nA: toggle-timer `30 seconds`\nQ: turn the timer on for half a minute and a half\nA: toggle-timer `30 seconds`\nQ: toggle timer for 60 seconds\nA: toggle-timer `60 seconds`\nQ: time to hit a dab\nA: toggle-timer `50 seconds`\nQ: %s" % command,
                temperature=0,
                max_tokens=64,
                top_p=1,
                frequency_penalty=0.2,
                presence_penalty=0,
                stop=["\nQ: "]
            )
        elif model == 'spotify-application':
            self.response = openai.Completion.create(
                engine="ada",
                prompt="Q: play crucial by false jasmine.\nA: toggle-spotify `false jasmine, crucial`\nQ: play false jasmine on spotify.\nA: toggle-spotify `false jasmine`\nQ: play false jasmine.\nA: toggle-spotify `false jasmine`\nQ: play vitamin c by can .\nA: toggle-spotify `can, vitamin c`\nQ: can we listen to the mars volta.\nA: toggle-spotify `the mars volta`\nQ: throw on some slum village.\nA: toggle-spotify `slum village`\nQ: play all my love by led zeppelin.\nA: toggle-spotify `led zeppelin, all my love`\nQ: play me some sublime .\nA: toggle-spotify `sublime`\nQ: can we listen to grace by jeff buckley.\nA: toggle-spotify `jeff buckley, grace`\nQ: play roundabout by yes.\nA: toggle-spotify `yes, roundabout`\nQ: play the widow by the mars volta.\nA: toggle-spotify `the mars volta, the widow`\nQ: play deep down by mike patton.\nA: toggle-spotify `mike patton, deep down`\nQ: play djedje by gordon.\nA: toggle-spotify `gordon, djedje`\nQ: play djedje.\nA: toggle-spotify `djedje`\nQ: play dig my grave by goat.\nA: toggle-spotify `goat, dig my grave`\nQ: play the mars volta.\nA: toggle-spotify `the mars volta`\nQ: play jeff buckley.\nA: toggle-spotify `jeff buckley`\nQ: play me a good song\nA: toggle-spotify `good`\nQ: i want to hear my favorite band, False Jasmine.\nA: toggle-spotify `false jasmine`\nQ: play my playlist baked on spotify.\nA: toggle-spotify-playlist `baked`\nQ: play my baked playlist.\nA: toggle-spotify-playlist `baked`\nQ: play my discover weekly playlist.\nA: toggle-spotify-playlist `discover weekly`\nQ: play the discover weekly playlist on spotify.\nA: toggle-spotify-playlist `discover weekly`\nQ: play my playlist your top songs twenty nineteen on spotify.\nA: toggle-spotify-playlist `your top songs 2019`\nQ: play my top songs twenty twenty one playlist.\nA: toggle-spotify-playlist `your top songs 2021`\nQ: play my playlist judge tunes on spotify.\nA: toggle-spotify-playlist `djedjetunes`\nQ: play judge tunes on spotify.\nA: toggle-spotify-playlist `djedjetunes`\nQ: play the mars volta.\nA: toggle-spotify `the mars volta`\nQ: %s" % command,
                temperature=0,
                max_tokens=64,
                top_p=1,
                frequency_penalty=0.2,
                presence_penalty=0,
                stop=["\nQ: "]
            )
        elif model == 'memory-application':
            self.response = openai.Completion.create(
                engine="ada",
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
    command.toggle_light('mode 3')