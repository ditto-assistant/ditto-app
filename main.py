"""
Combines speech to text and gpt3 api to make commands.

author: Omar Barazanji
"""

# handles text to speech
# run the following to install text to speech (windows):
#    ...python_install\Scripts\pywin32_postinstall.py -install
# https://stackoverflow.com/questions/22490233/win32com-import-error-python-3-4
import pyttsx

import os 
import time
from threading import Timer

# for top lvl error handling (see Command for full usage)
import openai
from serial.serialutil import Timeout

from speech import Speech
from command import Command

class Assistant:

    def __init__(self):
        self.speech = Speech()
        self.command = Command(os.getcwd())
        self.speech_engine = pyttsx.init()
        self.prompt = ""
        self.reply = ""
        self.application = "model-selector" # first application to boot into when name is spoken
        self.activation_mode = True # If true then idle and listening for name
        self.from_memory_read = (False,"") # used to handle memory to conversation read request
        self.from_memory_store = False # used to handle mem to conv store req
        self.conversation_timer = 0 # used to handle short term memory during conversation
        self.timer_mode = False

    def send_command(self): # application logic

        if self.application == 'light-application': # light application logic
            self.command.send_request(self.prompt, self.application)
            self.command_response = self.command.response.choices.copy().pop()['text'].split('\nA: ')[1]
            if 'toggle-light' in self.command_response:
                if 'off' in self.command_response:
                    self.command.toggle_light('off')
                    self.reply = '[Turning off the lights]'
                    print(self.reply)
                    self.activation_mode = True # go back to idle...
                    self.application = 'model-selector'
                elif 'on' in self.command_response:
                    self.command.toggle_light('on')
                    self.reply = '[Turning on the lights]'
                    print(self.reply)
                    self.activation_mode = True # go back to idle...
                    self.application = 'model-selector'
                elif 'sparkle' in self.command_response:
                    self.command.toggle_light('sparkle')
                    self.reply = '[Setting lights to sparkle]'
                    print(self.reply)
                    self.activation_mode = True # go back to idle...
                    self.application = 'model-selector'
                else:
                    print('invalid mode: %s' % self.command_response)
                    self.activation_mode = True # go back to idle...
                    self.application = 'model-selector'
            else:
                self.activation_mode = True # go back to idle...
                self.application = 'model-selector'
                print('invalid command')

            self.speech_engine.say(self.reply)
            self.speech_engine.runAndWait()
            self.reply = ""

        elif self.application == "conversation-application": # conversation application logic
            self.command.send_request(self.prompt, self.application)
            self.command_response = self.command.response.choices.copy().pop()['text'].split('\nA: ')[1]
            if 'toggle-conversation' in self.command_response:
                reply = self.command_response.strip("toggle-conversation `").strip("`")
                self.command.inject_response(self.prompt, reply) # add response to conversation prompt
                self.reply = ""
                if '\\n' in reply:
                    reply = reply.split('\\n')
                    print('\nA: ')
                    for x in reply:
                        print(x)
                        self.reply = self.reply + " " + x.strip('\\') 
                else: 
                    print('\nA: '+ reply)
                    self.reply = reply
                if self.from_memory_store: # used to tell (don't forget) assistant to remember things about itself (your)
                    self.application = 'memory-application'
                    self.prompt = self.reply
                if self.from_memory_read[0]: # used to let (what is) assistant remember things about itself (your)
                    self.application = 'memory-application'
                    self.prompt = self.reply
                else:
                    self.activation_mode = True # go back to idle...
                    self.application = 'model-selector'
            else:
                print('invalid reply')
                self.activation_mode = True # go back to idle...
                self.application = 'model-selector'

            self.speech_engine.say(self.reply)
            self.speech_engine.runAndWait()
            self.reply = ""

        elif self.application == "timer-application": # timer application logic
            self.command.send_request(self.prompt, self.application)
            self.speech.text = ""
            self.speech.activation.text = ""
            self.command_response = self.command.response.choices.copy().pop()['text'].split('\nA: ')[1]
            if 'toggle-timer' in self.command_response:
                reply = self.command_response.strip("toggle-timer `").strip("`")     
                self.reply = '[Setting timer for %s]' % reply
                print(self.reply)
                self.speech_engine.say(self.reply)
                self.speech_engine.runAndWait()
                self.command.toggle_timer(reply)
            else:
                print('invalid timer command')

            self.reply = ""
            self.activation_mode = True # go back to idle...
            self.application = 'model-selector'

        elif self.application == "spotify-application": # spotify application logic
            # added period to end of prompt to prevent GPT3 from adding more to prompt
            self.command.send_request(self.prompt+".", self.application)
            self.command_response = self.command.response.choices.copy().pop()['text'].split('\nA: ')[1]
            cmd = self.command_response.split("`")[0].strip(" ")
            reply = self.command_response.split("`")[1].strip(",")
            if 'toggle-spotify' == cmd:
                if isinstance(reply, str):
                    p = self.command.play_music(reply)
                    if p==1:
                        self.reply = '[Playing %s on Spotify]' % reply.title()
                        print(self.reply)
                    if (p==-1):
                        self.reply = '[Could not find %s on Spotify]' % reply.title()
                        print(self.reply)
                else:
                    p = self.command.play_music(reply[0], reply[1])
                    if p==1:
                        self.reply = '[Playing %s by %s on Spotify]' % (reply[1].title().strip(" "), reply[0].title())
                        print(self.reply)
                    if (p==-1):
                        self.reply = '[Could not find %s by %s on Spotify]' % (reply[1].title().strip(" "), reply[0].title())
                        print(self.reply)

            elif 'toggle-spotify-playlist' == cmd:
                p = self.command.play_user_playlist(reply.lower())
                if p==1:
                    self.reply = '[Playing %s Playlist on Spotify]' % reply.title()
                    print(self.reply)
                if p==-1:
                    self.reply = '[Could not find %s on Spotify]' % reply.title()
                    print(self.reply)

            else:
                print('invalid spotify command')

            self.speech_engine.say(self.reply)
            self.speech_engine.runAndWait()
            self.reply = ""
            self.activation_mode = True # go back to idle...
            self.application = 'model-selector'

        elif self.application == "memory-application": # memory application logic
            if not self.from_memory_read[0] and not self.from_memory_store:
                # added period to end of prompt to prevent GPT3 from adding more to prompt
                self.command.send_request(self.prompt+".", self.application)
                self.command_response = self.command.response.choices.copy().pop()['text'].split('\nA: ')[1]
                if 'toggle-memory-store' in self.command_response:

                    reply = self.command_response.replace("toggle-memory-store `","").strip("`").split(", ")
                    self.reply = ("[I'll remember %s]" % reply[0]).replace("my", "Your")
                    print(self.reply)
                    try:
                        self.command.store_memory(reply[0], reply[1])
                    except KeyError:                        
                        # might not use...
                        print('forwarding from `memory-store` to `conversation` application')
                        self.from_memory_store = False
                        self.prompt = self.speech.text
                        self.application = 'conversation-application'
                    except IndexError:
                        # might not use...
                        print('forwarding from `memory-store` to `conversation` application')
                        self.from_memory_store = False
                        self.prompt = self.speech.text
                        self.application = 'conversation-application'

                if 'toggle-memory-read' in self.command_response:
                    reply = self.command_response.replace("toggle-memory-read `","").strip("`").split(", ")
                    try:
                        value = self.command.read_memory(reply[0])
                    except KeyError:
                        print('forwarding from `memory-read` to `conversation` application')
                        # value doesn't exist in memory, grab value from conversation-application and store
                        self.from_memory_read = (True, reply[0]) # save key for conversation app to forward back here for storage
                        self.prompt = self.speech.text
                        self.application = 'conversation-application'
                    if not self.application=='conversation-application':
                        if 'your' in reply[0]: # memory about itself ('your' always in key)
                            self.reply = ("[%s]" % value)
                        else: # memory about you ('my' always in key)
                            self.reply = ("["+reply[0] + " is %s]" % value).replace("my", "Your")
                        print(self.reply)
                if not self.application=='conversation-application':
                    self.speech_engine.say(self.reply)
                    self.speech_engine.runAndWait()
                    self.reply = ""
                    self.activation_mode = True # go back to idle...
                    self.application = 'model-selector'
            else:
                if self.from_memory_read[0]: # we need to store result from conversation-app
                    print('forwarding from `conversation` to `memory-store`')
                    key = self.from_memory_read[1]
                    val = self.prompt
                    self.command.store_memory(key, val)
                    self.from_memory_read = (False,"")
                    self.reply = ""
                    self.activation_mode = True # go back to idle...
                    self.application = 'model-selector'

                if self.from_memory_store: # we need to read (might not use this)
                    pass


        elif self.application == 'model-selector': # model selector logic
            self.prompt = self.speech.text
            self.command.send_request(self.prompt, self.application)
            self.command_response = self.command.response.choices.copy().pop()['text'].split('\nA: ')[1]

            if 'light-application' in self.command_response:
                self.application = 'light-application'
            elif 'conversation-application'in self.command_response:
                self.application = 'conversation-application'
            elif 'timer-application' in self.command_response:
                self.application = 'timer-application'
            elif 'spotify-application' in self.command_response:
                self.application = 'spotify-application'
            elif 'memory-application' in self.command_response:
                self.application = 'memory-application'
            else:
                self.activation_mode = True # go back to idle...
                print('invalid application')


    def activation_sequence(self):
        self.activation_mode = True
        self.speech.record_audio(activation_mode=True) # record audio and listen for name
        if self.speech.activation.activate: # name has been spoken
            self.speech.activation.activate = False
            self.speech.text = ""
            self.speech.activation.text = ""

            # print("["+self.application+"]")
            print('   ,.,')
            print(' ((~"~))')
            print("'(|o_o|)'")
            print(",..\=/..,")

            self.activation_mode = False
            self.speech.record_audio(activation_mode=False) # record audio and listen for command
            if self.speech.activation.activate: # command has been spoken (app on enter section)
                print('sending request to GPT3')
                self.speech.activation.activate = False
                self.speech.activation.text = ""

                self.timeout_handler(10) # executes every 10 seconds (used to handle short term mem)
                self.conversation_timer = 0
                self.timer_mode = True # turn on timer

                ## enter application handler ## (main loop)
                while not self.activation_mode:

                    try:
                        self.send_command()
                        
                    except openai.error.APIConnectionError as e:
                        print("Error: trouble connecting to API (possibly no internet)")
                        print("Full Error: \n%d" % e)
                        self.activation_mode = True # back to idle ...
                        self.speech.text = ""
                        self.speech.activation.text = ""

                    except IndexError as e:
                        # ref:
                        # https://beta.openai.com/docs/api-reference/completions/create
                        print("Error: large prompt to small model (length termination)")
                        print("command reply error prompt: %s" % self.prompt)
                        print("raw response: \n")
                        print(self.command.response)
                        print('complete error: \n')
                        print(e)
                        self.activation_mode = True # back to idle ...
                        self.speech.text = ""
                        self.speech.activation.text = ""

                if self.activation_mode == True: # going back to idle... (app on exit section)
                    pass
                
            else: print('Canceling...')
                
    def timeout_handler(self, timeout=10):
        # print ("%d python seconds since activation" % sec)
        # print(self.command.conversation_prompt[-30:])
        self.timer = Timer(timeout, self.timeout_handler)
        self.timer.start()
        if self.timer_mode: self.conversation_timer += 1
        if self.conversation_timer == 10:
            self.conversation_timer = 0
            print('conversation timer reset\n\nidle...') 
            self.command.reset_conversation() # reset conversation prompt 
            self.timer.cancel()
            self.timer_mode = False # turn off timer

        
        

if __name__ == "__main__":
    assistant = Assistant()
    while True:
        assistant.activation_sequence()
