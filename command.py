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

from modules.hourglass.timer import Timer

openai.api_key = os.getenv("OPENAI_API_KEY")

class Command:

    def __init__(self):
        self.light_status = True
        self.light_mode = 'default'
        self.response = ''
        self.command_input = ''

    def toggle_light(self, mode):
        try:
            s =serial.Serial('COM3', baudrate=9600, bytesize=8)
            if mode == 'on':
                s.write(b'\x00')
                self.light_status = True
                self.light_mode = 'default'
            elif mode == 'off':
                s.write(b'\x01')
                self.light_status = False
            elif mode == 'sparkle':
                self.light_mode = 'sparkle'
                s.write(b'\x02')
            else:
                print('not a valid light mode')
                self.light_mode = self.light_mode
        except:
            print('no device found')

    def toggle_timer(self, val):
        timer = Timer()
        timer.set_timer(val)


    def send_request(self, command, model):
        self.command_input = command
        start_sequence = "\nA:"
        restart_sequence = "\nQ:"

        if model == 'model-selector':
            self.response = openai.Completion.create(
                    engine="ada",
                    prompt="Q: turn off the lights\nA: light-application \nQ: turn on the lights\nA: light-application \nQ: set the lights to sparkle\nA: light-application \nQ: put the lights on sparkle mode\nA: light-application \nQ: how are you doing\nA: conversation-application \nQ: what's the meaning of life\nA: conversation-application \nQ: i hope your day is going well.\nA: conversation-application \nQ: yo\nA: conversation-application \nQ: can you turn the lights off\nA: light-application\nQ: write me a poem\nA: conversation-application \nQ: how do you split and atom in half\nA: conversation-application\nQ: what happens when you mix baking soda and vinegar\nA: conversation-application\nQ: set a timer for 45 seconds\nA: timer-application\nQ: timer 1 minute\nA: timer-application\nQ: turn off the lights\nA: light-application\nQ: what is the meaning of life?\nA: conversation-application\nQ: count down from 50\nA: timer-application\nQ: turn it off\nQ: it's dab time\nA: timer-application\nQ: time to hit a dab\nA: timer-application\nQ: set a dab timer\nA: timer-application\nQ: who are you\nA: conversation-application\nQ: turn off the lights\nA: light-application\nQ: %s" % command,
                    temperature=0,
                    max_tokens=100,
                    top_p=1,
                    frequency_penalty=0.2,
                    presence_penalty=0,
                    stop=["\nQ: "]
                )
        elif model == 'light-application':
            self.response = openai.Completion.create(
                engine="ada",
                prompt="Q: turn off the lights.\nA: toggle-light `off`\nQ: turn on the lights.\nA: toggle-light `on`\nQ: lights on.\nA: toggle-light `on`\nQ: lights off.\nA: toggle-light `off`\nQ: can you turn the lights on?\nA: toggle-light `on`\nQ: toggle lights\nA: toggle-light `off`\nQ: toggle lights\nA: toggle-light `on`\nQ: set the lights to sparkle\nA: toggle-light `sparkle`\nQ: put the lights on sparkle mode\nA: toggle-light `sparkle`\nQ: sparkle\nA: toggle-light `sparkle`\nQ: turn the lights on.\nA: toggle-light `on`\nQ: set the lights to sparkle\nA: toggle-light `sparkle`\nQ: turn off the lights.\nA: toggle-light `off`\nQ: set the was to sparkle\nA: toggle-light `sparkle`\nQ: %s" % command,
                temperature=0.05,
                max_tokens=100,
                top_p=1,
                frequency_penalty=0.2,
                presence_penalty=0,
                stop=["\nQ: "]
            )
        elif model == 'conversation-application':
            self.response = openai.Completion.create(
                engine="babbage",
                prompt="Q: hello.\nA: toggle-conversation `Hello! What's up? \nQ: how are you?\nA: toggle-conversation `I'm doing great!` How are you?\nQ: what is your name?\nA: toggle-conversation `My name is Ditto!`\nQ: what is your name?\nA: toggle-conversation `Ditto.`\nQ: what's the population of Brazil?\nA: toggle-conversation `212.6 million as of 2020.`\nQ: what's the meaning of life?\nA: toggle-conversation `the meaning of life is to love oneself and to spread love to others.`\nQ: can you take the square root of a negative number?\nA: toggle-conversation `The square root of a negative number does not exist among the set of real numbers; however, the imaginary number \"i\" is the square root of negative one.`\nQ: can you write me a poem?\nA: toggle-conversation `Despite the storms, \\nbeauty arrives like \\nit was always going to. \\nDespite the darkness, \\nthe light returns. \\nDespite your loss, \\nyour heart will be \\nfull again. \\nDespite the breaking, \\nyour heart will feel \\nlike it belongs in the \\nland of joy once more. \\nThis is how it will \\nalways be. Keep living.`\nQ: can you tell me who the president of the United States was in 1975?\nA: toggle-conversation `Gerald Ford was the president of the United States in 1975.`\nQ: write me a song\nA: toggle-conversation `I'm not a musician, but I'll give it a shot. \\n \\nFresh day in the simulation \\nSleep all day, it's living \\nFlying at the speed of light, \\nIt's really gonna be alright.`\nQ: write me another song\nA: toggle-conversation `A gift for you \\nA gift for me \\nYou're the one \\nThat lives for me \\nAnd I for you \\nTrue love is thee.`\nQ: write me a cool song\nA: toggle-conversation `It's a rock & roll song. It's about a guy and his friend. \\n\\nThey're in a band. \\nThey want to play at a party. \\nThey're in their living room, playing this song, \\nand it's really loud. \\nAnd the guy is like, \\n\"That's it, that's it! \\nWe're going to go play that party!`\nQ: Who was the 16th president of the united states?\nA: toggle-conversation `Abraham Lincoln was the 16th president of the United States.`\nQ: What is an atom made up of?\nA: toggle-conversation `The atom is made up of protons and neutrons, which have electrons surrounding them.`\nQ: How can I start my day better?\nA: toggle-conversation `Start your day with a good breakfast. \\nStand up and move around in your living room. \\nRelax for a bit. \\nGo for a walk in the park. \\nTry to get some exercise in the afternoon. \\nEat healthier meals.\\nLeave a little more time for the evening. \\Sleep better the day before.`\nQ: Who are you?\nA: toggle-conversation `I'm Ditto! My backend is on GPT-3, a powerful language model made by openai.`\nQ: %s" % command,
                temperature=0.6,
                max_tokens=200,
                top_p=1,
                frequency_penalty=0.2,
                presence_penalty=0,
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
    
if __name__ == "__main__":
    command = Command()
    # command.send_request("turn em off")