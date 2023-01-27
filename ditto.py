"""
Combines speech to text and gpt3 api to make commands.

author: Omar Barazanji
"""

# handles text to speech
import pyttsx3

# other imports
import os 
import time
import pygame
from threading import Timer

from speech import Speech
from command_handlers.command import Command
from modules.offline_nlp.handle import NLP
from modules.google_tts.speak import Speak
from modules.security_camera.security_cam import SecurityCam
import json
import platform 
import numpy as np

# used to send keypress event (keeps display on)
try:
    import pyautogui
    pyautogui.FAILSAFE = False
    headless = False
except:
    headless = True
    print('booting headless...')


UNIX = False
if platform.system() == 'Linux':
    UNIX = True

OFFLINE_MODE = False

import sqlite3

class Assistant:

    def __init__(self, offline_mode=OFFLINE_MODE):
        print('[Booting...]')
        self.load_config()
        self.security_camera = SecurityCam(os.getcwd())
        self.speech = Speech(offline_mode=offline_mode, mic=self.config['microphone'])
        self.command = Command(os.getcwd(), offline_mode)
        self.speech_engine = pyttsx3.init()
        self.nlp = NLP(os.getcwd())
        self.nlp.initialize()
        self.nlp.contruct_sentence_vectors()
        self.google = Speak()
        # self.speech_engine.setProperty('voice', 'english')
        # self.speech_engine.setProperty('rate', 190)
        self.speech_volume = self.config['volume'] # percent
        self.prompt = ""
        self.reply = ""
        self.activation_mode = True # If true then idle and listening for name

        self.conversation_timer = 0 # used to handle short term memory during conversation
        self.conv_timer_mode = False # used to trigger the resetting of prompt (context)

        self.skip_name = False # used to skip name (conversation app)

        self.command_timer = 0 # used to handle the timeout of interaction with assistant
        self.comm_timer_mode = False # will go to false after 5 seconds of inactivity (idle)

    def load_config(self):
        config_path = 'resources/config.json'
        default_config = '{"volume": 70, "teensy_path": ""}'
        try:
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        except:
            self.config = json.loads(default_config)
            with open(config_path, 'w') as f:
                f.write(default_config)

    def reset_loop(self):
        '''
        Resets the command loop to idle.
        '''
        self.activation_mode = True # go back to idle... 
        self.speech.text = ''
        self.prompt = ''
        self.comm_timer_mode = False
        self.comm_timer.cancel()
        self.speech.from_gui = False

    def play_sound(self, sound='off'):
        print(f'Gui Mode {self.speech.from_gui}')
        if not self.speech.from_gui:
            pygame.mixer.init()
            pygame.mixer.music.load(f"resources/sounds/ditto-{sound}.mp3")
            pygame.mixer.music.play()
            while pygame.mixer.music.get_busy() == True:
                continue

    def skip_wake(self):
        '''
        For applications that require looping, we can skip wake.
        '''
        self.conv_timer.cancel() # reset conversation cooldown (turns on automatically on loop)
        self.speech.activation.activate = True # skip wake-up sequence (name is already called)
        self.speech.skip_wake = True
        self.command_timer = 0 # reset command timer 
        self.comm_timer_mode = False # (pause to not iterrupt assistant speaking)
        self.comm_timer.cancel()

    def conversation_app(self, action=None):

        def conversation_flow():
            self.reply = self.command.conversation_handler.handle_response(self.command, self.prompt)
            if self.reply == '': self.reply = '...'
            self.tts(self.reply)
            if not self.speech.from_gui: 
                self.skip_wake()
            else:
                self.reset_loop()
                
        if action == 'exit':
            if not self.speech.from_gui:
                self.reply = '[Exiting Conversation Loop]'
                self.reset_loop()
                self.play_sound('off')
            else:
                conversation_flow()
        else:
            conversation_flow()

    def send_command(self): # application logic

        # grab user's prompt from speech module
        self.prompt = self.speech.text
        
        # log the user's prompt 
        print('\n\nwriting prompt to db...')
        self.write_prompt_to_db() 

        if 'GestureNet' in self.prompt:
            cat = 'gesture'
            sub_cat = 'none'
            action = 'none'
            gesture = self.speech.gesture
        else:
            # get intent from offline npl module 
            self.offline_response = json.loads(self.nlp.prompt(self.prompt))
            cat = self.offline_response['category']
            sub_cat = self.offline_response['sub_category']
            action = self.offline_response['action']

        print('\n\n')
        print(cat, sub_cat, action)
        print('\n\n')

        # send prompt to application / category 
        if  cat == 'lights':
            self.reply = self.command.light_handler.handle_response(self.nlp, self.prompt)
            self.tts(self.reply)
            self.reset_loop()

        elif cat == 'spotify':
            try:
                self.reply = self.command.spotify_handler.handle_response(self.command, self.nlp, self.prompt)
            except BaseException as e:
                self.reply = self.command.conversation_handler.handle_response(self.command, self.prompt)
            self.tts(self.reply)
            self.reset_loop()

        elif cat == 'music':
            try:
                self.command.player.remote(self.offline_response['action'])
                if self.speech.from_gui:
                    self.reply = '[Done.]'
                self.reset_loop()
            except BaseException as e:
                print(e)
                self.conversation_app()
            
        elif cat == 'timer':
            try:
                self.reply = self.command.timer_handler.handle_response(self.command, self.nlp, self.prompt)
                self.tts(self.reply)
                self.reset_loop()
            except BaseException as e:
                print(e)
                self.conversation_app()
            
        elif cat == 'gesture':
            if gesture == 'like':
                self.reply = f'[GestureNet: {gesture}]'
                if not headless: pyautogui.press('right')
            elif gesture == 'dislike':
                self.reply = f'[GestureNet: {gesture}]'
                if not headless: pyautogui.press('left')
            self.tts(self.reply)
            self.reset_loop()
        
        elif cat == 'security':
            if not headless:
                self.reply = f'[Opening {action} camera.]'
                self.security_camera.open_cam(action)
                self.tts(self.reply)
                self.reset_loop()
            else:
                self.reply = '[Exiting Conversation Loop]'
                self.reset_loop()
                self.play_sound('off')

        elif cat == 'weather':
            try:
                self.reply = self.command.weather_handler.handle_response(self.command, sub_cat)
                self.tts(self.reply)
                self.reset_loop()
            except BaseException as e:
                print(e)
                self.conversation_app()
            
        elif cat == 'wolfram':
            try:
                self.reply = self.command.wolfram_handler.handle_response(self.command, sub_cat, self.prompt)
                print(f'\nWolfram Reply len: `{len(self.reply)}`\n')
                if len(self.reply) > 0 and len(self.reply) < 99:
                    self.tts(self.reply)
                    self.reset_loop()
                else:
                    self.conversation_app()
            except BaseException as e:
                print(e)
                self.conversation_app()

        elif cat == 'conv': # send to conversation handler

            self.conversation_app(action)

        self.write_response_to_db() # log self.reply

    def write_response_to_db(self):
        if not self.reply: self.reply = '[empty]'
        SQL = sqlite3.connect("ditto.db")
        cur = SQL.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS responses(response VARCHAR)")
        SQL.commit()
        cur.execute("INSERT INTO responses VALUES('%s')" % self.reply.replace("'", "''"))
        SQL.commit()
        SQL.close()
        self.reply = '' # reset for next loop

    def write_prompt_to_db(self):
        SQL = sqlite3.connect("ditto.db")
        cur = SQL.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS prompts(prompt VARCHAR)")
        SQL.commit()
        cur.execute("INSERT INTO prompts VALUES('%s')" % self.prompt.replace("'", "''"))
        SQL.commit()
        SQL.close()


    def activation_sequence(self):
        self.activation_mode = True
        self.speech.record_audio(activation_mode=self.activation_mode) # record audio and listen for name
        if self.speech.activation.activate: # name has been spoken
            self.play_sound('on')
            self.speaker_timer = 0 # reset speaker + mic timer

            self.speech.activation.activate = False
            self.speech.text = ""
            self.speech.activation.text = ""

            self.activation_mode = False

            self.comm_timer_mode = True # turn on timer
            self.command_timer = 0 # (can be used per application for detecting user idle to cancel)
            self.command_timeout_handler(30) # executes every n 'seconds' (used to handle back to idle)

            self.speech.record_audio(activation_mode=self.activation_mode) # record audio and listen for command                

            if self.comm_timer_mode: # command has been spoken (app on enter section)
                self.comm_timer.cancel()
                print("Q: %s\n" % self.speech.activation.text)
                self.speech.activation.activate = False
                self.speech.activation.text = ""

                self.conv_timer_mode = True # turn on timer
                self.conversation_timer = 0
                self.conversation_timeout_handler(15) # executes every n "seconds" (used to handle short term mem)

                ## enter application handler ## (main loop)
                # while not self.activation_mode:
                try:
                    self.send_command()

                except BaseException as e:
                    print('\n\n[Unexpected Error: ]\n')
                    print(e)
                    self.reply = '...'
                    self.tts(self.reply)
                    self.reset_loop()
                
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
            self.play_sound('off')
             # go back to idle ...
            self.comm_timer.cancel()
            self.comm_timer_mode = False # turn off timer
            self.reset_loop()
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
 

    def tts(self, reply):
        try:
            if UNIX:
                os.system('amixer -q set Master ' + str(self.speech_volume)+'%')
            # os.system('pico2wave -w reply.wav "%s" && aplay -q reply.wav' % prompt.strip("[]"))
            if not self.speech.offline_mode:
                self.google.gtts(reply)
            else:
                self.speech_engine.say(reply)
                self.speech_engine.runAndWait()
        except BaseException as e:
            print(e)
    

if __name__ == "__main__":

    assistant = Assistant()
    while True:
        assistant.activation_sequence()
