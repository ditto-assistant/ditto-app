"""
Combines speech to text and gpt3 api to make commands.

author: Omar Barazanji
"""

# handles text to speech
from re import sub
import pyttsx3

# other imports
import os 
import sys
import time
import time
import openai
import pygame
from threading import Timer

from speech import Speech
from command import Command
from modules.offline_nlp.handle import NLP
from modules.google_tts.speak import Speak
import json
import platform 
import numpy as np

UNIX = False
if platform.system() == 'Linux':
    UNIX = True

class Assistant:

    def __init__(self):
        print('[Booting...]')
        self.speech = Speech()
        self.command = Command(os.getcwd())
        self.speech_engine = pyttsx3.init()
        self.nlp = NLP(os.getcwd())
        self.nlp.initialize()
        self.nlp.contruct_sentence_vectors()
        self.google = Speak()
        # self.speech_engine.setProperty('voice', 'english')
        # self.speech_engine.setProperty('rate', 190)
        self.speech_volume = 50 # percent
        self.prompt = ""
        self.reply = ""
        self.application = "model-selector" # first application to boot into when name is spoken
        self.activation_mode = True # If true then idle and listening for name
        self.from_memory_read = (False,"") # used to handle memory to conversation read request
        self.from_memory_store = False # used to handle mem to conv store req

        self.conversation_timer = 0 # used to handle short term memory during conversation
        self.conv_timer_mode = False # used to trigger the resetting of prompt (context)

        self.skip_name = False # used to skip name (conversation app)

        self.command_timer = 0 # used to handle the timeout of interaction with assistant
        self.comm_timer_mode = False # will go to false after 5 seconds of inactivity (idle)
        
        self.val_map = np.linspace(0, 65535, 10).tolist()

        

    def send_command(self): # application logic

        if self.application == "conversation-application": # conversation application logic
            self.command.send_request(self.prompt+'.', self.application)
            self.command_response = self.command.response.choices.copy().pop()['text'].split('\nA: ')[1]
            
            if 'toggle-conversation' in self.command_response:

                reply = self.command_response.strip("toggle-conversation `").strip("`")
                self.command.inject_response(self.prompt, reply) # add response to conversation prompt
                self.reply = ""

                print('\nA: '+ reply)
                self.reply = reply

                self.activation_mode = True # go back to idle...
                self.application = 'model-selector'
            else:
                print('invalid reply')
                self.activation_mode = True # go back to idle...
                self.application = 'model-selector'

            self.conv_timer.cancel() # reset conversation cooldown (turns on automatically on loop)
            self.speech.activation.activate = True # skip wake-up sequence (name is already called)
            self.speech.skip_wake = True
            self.speech.idle_loop_count = 1 # skip to listening... print out
            self.command_timer = 0 # reset command timer 
            self.comm_timer_mode = False # (pause to not iterrupt assistant speaking)
            self.comm_timer.cancel()

            if UNIX:
                self.tts(self.reply, self.speech_volume)
            else:
                self.speech_engine.say(self.reply)
                self.speech_engine.runAndWait()

        elif self.application == 'model-selector': # model selector logic
            self.prompt = self.speech.text

            # check to see if can be handled offline before GPT-3...
            self.offline_response = json.loads(self.nlp.prompt(self.prompt))

            if self.offline_response['category'] == 'lights':
                if self.offline_response['sub_category'] == 'none':
                    if 'off' in self.offline_response['action']:
                        self.reply = '[Turning off the lights]'
                    elif 'on' in self.offline_response['action']:
                        self.reply = '[Turning on the lights]'
                    else: 
                        self.reply = '[Setting lights to %s]' % self.offline_response['action']
                    self.command.toggle_light(self.offline_response['action'])
                else:
                    try:
                        sub_cat = self.offline_response['sub_category']
                        if 'bedroom-light' in sub_cat:
                            action = self.offline_response['action']
                            if not action == 'numeric':
                                self.command.bedroom_light.set_power(action)
                                if action == 'on':
                                    self.reply = '[Turning on the bedroom lights]'
                                else: self.reply = '[Turning off the bedroom lights]'
                            else:
                                self.ner_response = json.loads(self.nlp.prompt_ner_numeric(self.prompt))
                                value = self.ner_response['numeric']
                                val_scale = self.val_map[int(value)]
                                self.command.bedroom_light.set_brightness(val_scale)

                        elif 'bedroom-lamp' in sub_cat:
                            action = self.offline_response['action']
                            
                            if action == 'on':
                                self.reply = '[Turning on the bedroom lamp]'
                                self.command.bedroom_lamp.set_power(action)
                            elif action == 'off':
                                self.reply = '[Turning off the bedroom lamp]'
                                self.command.bedroom_lamp.set_power(action)
                            else:
                                self.reply = '[Setting bedroom lamp to %s]' % action
                                self.command.toggle_lamp_color(action)
                                
                        elif 'bathroom' in sub_cat:
                            action = self.offline_response['action']
                            if not action == 'numeric':
                                self.command.bathroom_left.set_power(action)
                                self.command.bathroom_right.set_power(action)
                                if action == 'on':
                                    self.reply = '[Turning on the bathroom lights]'
                                else: self.reply = '[Turning off the bathroom lights]'
                            else:
                                self.ner_response = json.loads(self.nlp.prompt_ner_numeric(self.prompt))
                                value = self.ner_response['numeric']
                                if int(value) >= 1 and int(value) <= 10: # (vals 1-10 valid)
                                    val_scale = self.val_map[int(value)-1]
                                    self.command.bathroom_left.set_brightness(val_scale)
                                    self.command.bathroom_right.set_brightness(val_scale)
                                    self.reply = '[Setting bathroom lights brightness to %d]' % int(value)
                                else:
                                    self.reply = 'Brightness values are from 1 to 10.'
                    except:
                        self.reply = '[Light not found]'
                        
                print(self.reply+'\n')
                if UNIX:
                    self.tts(self.reply, self.speech_volume)
                else:
                    self.speech_engine.say(self.reply)
                    self.speech_engine.runAndWait()

                self.activation_mode = True # go back to idle...
                self.reply = ''

            elif self.offline_response['category'] == 'spotify':
                self.ner_response = json.loads(self.nlp.prompt_ner_play(self.prompt))
                song = self.ner_response['song']
                artist = self.ner_response['artist']
                playlist = self.ner_response['playlist']
                if playlist == '':
                    if song == '':
                        p = self.command.play_music(artist.strip())
                        if p==1:
                            self.reply = '[Playing %s on Spotify]' % artist.title()
                        if (p==-1):
                            self.reply = '[Could not find %s on Spotify]' % artist.title()
                    elif artist == '':
                        p = self.command.play_music(song.strip())
                        if p==1:
                            self.reply = '[Playing %s on Spotify]' % song.title()
                        if (p==-1):
                            self.reply = '[Could not find %s on Spotify]' % song.title()
                    else:
                        p = self.command.play_music(artist.strip(), song.strip())
                        if p==1:
                            self.reply = '[Playing %s by %s on Spotify]' % (song.title(), artist.title())
                        if (p==-1):
                            self.reply = '[Could not find %s by %s on Spotify]' % (song.title(), artist.title())
                else:
                    try:
                        p = self.command.play_user_playlist(playlist.lower().strip())
                    except:
                        p==-1
                    if p==1:
                        self.reply = '[Playing %s Playlist on Spotify]' % playlist.title()
                    if p==-1:
                        self.reply = '[Could not find %s Playlist on Spotify]' % playlist.title()
                
                print(self.reply+'\n')
                if UNIX:
                    self.tts(self.reply, self.speech_volume)
                else:
                    self.speech_engine.say(self.reply)
                    self.speech_engine.runAndWait()
                self.reply = ''
                self.activation_mode = True # go back to idle...

            elif self.offline_response['category'] == 'music':
                self.command.player.remote(self.offline_response['action'])
                self.activation_mode = True # go back to idle...
                self.reply = ''
                
            elif self.offline_response['category'] == 'timer':
                self.ner_response = json.loads(self.nlp.prompt_ner_timer(self.prompt))
                time = self.ner_response['time']
                if not time == '':
                    reply = time.strip(' ').replace('seconds', 's').replace('minutes', 'm').replace(' ', '')
                    self.reply = '[Setting timer for %s]' % time
                    print(self.reply+'\n')
                    if UNIX:
                        self.tts(self.reply, self.speech_volume)
                    else:
                        self.speech_engine.say(self.reply)
                        self.speech_engine.runAndWait()
                    self.command.toggle_timer(reply)
                    
                self.activation_mode = True # go back to idle...
                self.reply = ''
            
            elif self.offline_response['category'] == 'weather':
                sub_cat = self.offline_response['sub_category']
                if sub_cat == 'none':
                    response = json.loads(self.command.weather_app.get_weather())['curr_temp']
                    location = self.command.weather_app.location
                    self.reply = "[It's currently %s degrees in %s]" % (response, location)
                    print(self.reply+'\n')
                if UNIX:
                    self.tts(self.reply, self.speech_volume)
                else:
                    self.speech_engine.say(self.reply)
                    self.speech_engine.runAndWait()

                self.activation_mode = True # go back to idle...
                self.reply = ''

            elif self.offline_response['category'] == 'wolfram':
                if self.offline_response['sub_category'] == 'math':
                    self.reply = self.command.wolfram.get_response(self.prompt.lower())
                else: 
                    self.reply = self.command.wolfram.get_response(self.prompt)
                if not self.reply == '' and not self.reply == '(data not available)':
                    # self.reply = reply.split("(")[0]
                    print(self.reply+'\n')
                    if UNIX:
                        self.tts(self.reply, self.speech_volume)
                    else:
                        self.speech_engine.say(self.reply)
                        self.speech_engine.runAndWait()
                    self.activation_mode = True # go back to idle...    
                    self.reply = ''
                else:
                    self.application = 'conversation-application'
                
                
            else: # send to GPT3 if conversational intent extracted by offline model

                self.application = 'conversation-application'

    def activation_sequence(self):
        self.activation_mode = True
        self.speech.record_audio(activation_mode=self.activation_mode) # record audio and listen for name
        if self.speech.activation.activate: # name has been spoken

            self.speaker_timer = 0 # reset speaker + mic timer

            self.speech.activation.activate = False
            self.speech.text = ""
            self.speech.activation.text = ""

            self.activation_mode = False

            self.comm_timer_mode = True # turn on timer
            self.command_timer = 0 # (can be used per application for detecting user idle to cancel)
            self.command_timeout_handler(4) # executes every n 'seconds' (used to handle back to idle)

            self.speech.record_audio(activation_mode=self.activation_mode) # record audio and listen for command
            
            if self.speech.text == 'cancel' or self.speech.text == 'goodbye': # if the user would like to cancel
                pygame.mixer.init()
                pygame.mixer.music.load("resources/sounds/ditto-off.mp3")
                pygame.mixer.music.play()
                while pygame.mixer.music.get_busy() == True:
                    continue
                self.comm_timer_mode = False
                self.comm_timer.cancel()

            if self.comm_timer_mode: # command has been spoken (app on enter section)
                self.comm_timer.cancel()
                # print('sending request to GPT3')
                print("Q: %s\n" % self.speech.activation.text)
                self.speech.activation.activate = False
                self.speech.activation.text = ""

                self.conv_timer_mode = True # turn on timer
                self.conversation_timer = 0
                self.conversation_timeout_handler(15) # executes every n "seconds" (used to handle short term mem)

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
                        print('[IndexError from GPT3 Response Handler]\n')
                        print(self.command.response)
                        print('\nError Message: ')
                        print(e)
                        self.activation_mode = True # back to idle ...
                        self.speech.text = ""
                        self.speech.activation.text = ""
                        self.application = 'model-selector'

                    except openai.error.InvalidRequestError as e:
                        print('[resetting context]\n')
                        self.command.reset_conversation()

                if self.activation_mode == True: # going back to idle... (app on exit section)
                    self.comm_timer_mode = False # pause command timer (auto resumes on wakeup if needed)
                
            else:
                self.speech.activation.activate = False # back to idle ...
                self.speech.activation.text = ""
                # print('Canceling...')

    def command_timeout_handler(self, timeout):
        self.comm_timer = Timer(timeout, self.command_timeout_handler, [timeout])
        self.comm_timer.start()
        if self.comm_timer_mode: 
            self.command_timer += 1
            # print("command timer: %d" % self.command_timer)
        if self.command_timer == timeout:
            self.command_timer = 0
            print('[command timer reset]\n') 
            pygame.mixer.init()
            pygame.mixer.music.load("resources/sounds/ditto-off.mp3")
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy() == True:
                continue

             # go back to idle ...
            self.comm_timer.cancel()
            self.comm_timer_mode = False # turn off timer
            self.speech.activation.activate = True
            self.activation_mode = True
            self.speech.idle_loop_count = 0
            self.speech.comm_timer_mode = False # send to speech submodule for handling 

        
    def conversation_timeout_handler(self, timeout):
        # print(self.command.conversation_prompt[-30:])
        self.conv_timer = Timer(timeout, self.conversation_timeout_handler, [timeout])
        self.conv_timer.start()
        if self.conv_timer_mode: 
            self.conversation_timer += 1
            # print ("conversation counter: %d" % self.conversation_timer)
        if self.conversation_timer == timeout:
            self.conversation_timer = 0
            print('[conversation timer reset]\n\nidle...') 
            self.command.reset_conversation() # reset conversation prompt 
            self.conv_timer.cancel()
            self.conv_timer_mode = False # turn off timer

    

    def tts(self, prompt, volume_percent):
        os.system('amixer -q set Master ' + str(volume_percent)+'%')
        # os.system('pico2wave -w reply.wav "%s" && aplay -q reply.wav' % prompt.strip("[]"))
        self.google.gtts(prompt)
        
if __name__ == "__main__":

    assistant = Assistant()
    if UNIX:
        os.system('eval $(./resources/export.sh)')
    while True:
        assistant.activation_sequence()
