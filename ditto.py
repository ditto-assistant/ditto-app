"""
Combines speech to text and gpt3 api to make commands.

author: Omar Barazanji
"""

# handles text to speech
# import pyttsx3

# other imports
import sqlite3
import os
import time
import pygame
from threading import Timer
import requests
from speech import Speech
from command_handlers.command import Command
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

pygame.mixer.init(channels=8)


class Assistant:

    def __init__(self, offline_mode=OFFLINE_MODE):
        print('[Booting...]')
        self.update_status_db('booting')
        self.load_config()
        self.security_camera = SecurityCam(os.getcwd())
        self.speech = Speech(offline_mode=offline_mode,
                             mic=self.config['microphone'])
        self.command = Command(os.getcwd(), offline_mode)
        self.speech_engine = ''
        self.google = Speak()
        # self.speech_engine.setProperty('voice', 'english')
        # self.speech_engine.setProperty('rate', 190)
        self.speech_volume = self.config['volume']  # percent
        self.prompt = ""
        self.reply = ""
        self.activation_mode = True  # If true then idle and listening for name

        self.reset_conversation = False  # used to skip writing reset commands to DB

        self.skip_name = False  # used to skip name (conversation app)

        self.command_timer = 0  # used to handle the timeout of interaction with assistant
        self.retries = 0
        # will go to false after 5 seconds of inactivity (idle)
        self.comm_timer_mode = False
        self.update_status_db('on')

    def load_config(self):
        config_path = 'resources/config.json'
        default_config_path = 'resources/template_config.json'
        if 'config.json' in os.listdir('resources'):
            with open(config_path, 'r') as f:
                self.config = json.load(f)
        else:
            with open(default_config_path, 'r') as f:
                self.config = json.load(f)
            with open(config_path, 'w') as f:
                json.dump(self.config, f, indent=4)
            print('\nRun configgui.py or fill out generated resources/config.json ...\n')
            exit()
        self.nlp_ip = self.config['nlp-server']

    def reset_loop(self):
        '''
        Resets the command loop to idle.
        '''
        self.activation_mode = True  # go back to idle...
        self.speech.text = ''
        self.prompt = ''
        self.comm_timer_mode = False
        self.comm_timer.cancel()
        self.speech.from_gui = False

    def play_sound(self, sound='off'):
        print(f'Gui Mode {self.speech.from_gui}')
        if self.speech.from_gui:
            return
        elif self.reset_conversation:
            return
        else:
            if self.command.soundscapes_handler.soundscapes.playing:
                if sound == 'on':
                    pygame.mixer.music.set_volume(0.2)
                if sound == 'off':
                    pygame.mixer.music.set_volume(1.0)
            else:
                channel = pygame.mixer.find_channel(True)
                pygame.mixer.music.load(f"resources/sounds/ditto-{sound}.mp3")
                channel.set_volume(
                    1.0
                )
                channel.play(pygame.mixer.Sound(
                    f"resources/sounds/ditto-{sound}.mp3"))

    def skip_wake(self):
        '''
        For applications that require looping, we can skip wake.
        '''
        self.speech.activation.activate = True  # skip wake-up sequence (name is already called)
        self.speech.skip_wake = True
        self.command_timer = 0  # reset command timer
        # (pause to not iterrupt assistant speaking)
        self.comm_timer_mode = False
        self.comm_timer.cancel()

    def prompt_intent(self, prompt):
        base_url = f"http://{self.nlp_ip}:32032/intent/"
        response = requests.post(base_url, params={"prompt": prompt})
        return response.content.decode()

    def conversation_app(self, action=None):

        def conversation_flow():
            self.reply = self.command.conversation_handler.handle_response(
                self.command, self.prompt)
            if self.reply == '':
                self.reply = '...'
            self.tts(self.reply)
            if not self.speech.from_gui:
                # self.skip_wake()
                self.reset_loop()
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

    def send_command(self):  # application logic

        # grab user's prompt from speech module
        self.prompt = self.speech.text

        # log the user's prompt
        # print('writing prompt to db...')
        self.write_prompt_to_db()

        if 'GestureNet' in self.prompt:
            cat = 'gesture'
            sub_cat = 'none'
            action = 'none'
            gesture = self.speech.gesture
        elif 'resetConversation' in self.prompt:
            cat = 'reset'
            sub_cat = 'none'
            action = 'none'
        else:
            # get intent from offline npl module
            self.offline_response = json.loads(self.prompt_intent(self.prompt))
            cat = self.offline_response['category']
            sub_cat = self.offline_response['sub_category']
            action = self.offline_response['action']

            if 'exit' in action and self.command.soundscapes_handler.soundscapes.playing:
                cat = 'soundscapes'
                sub_cat = 'none'
                action = 'exit'

        print(cat, sub_cat, action)

        # send prompt to application / category
        if cat == 'lights':
            self.reply = self.command.light_handler.handle_response(
                self.prompt, self.tts).reply
            # self.tts(self.reply)
            self.reset_loop()

        elif cat == 'spotify':
            try:
                self.reply = self.command.spotify_handler.handle_response(
                    self.command, self.prompt)
            except BaseException as e:
                self.reply = self.command.conversation_handler.handle_response(
                    self.command, self.prompt)
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
                self.reply = self.command.timer_handler.handle_response(
                    self.command, self.prompt)
                self.tts(self.reply)
                self.reset_loop()
            except BaseException as e:
                print(e)
                self.conversation_app()

        elif cat == 'gesture':
            if gesture == 'like':
                # self.reply = f'[GestureNet: {gesture}]'
                self.prompt = 'turn on the lights'
                self.reply = self.command.light_handler.handle_response(
                    self.prompt)
                # pyautogui.press('right')
            elif gesture == 'dislike':
                # self.reply = f'[GestureNet: {gesture}]'
                # pyautogui.press('left')
                self.prompt = 'set the lights to sparkle'
                self.reply = self.command.light_handler.handle_response(
                    self.prompt)
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
                self.reply = self.command.weather_handler.handle_response(
                    sub_cat, action)
                self.tts(self.reply)
                self.reset_loop()
            except BaseException as e:
                print(e)
                self.conversation_app()

        elif cat == 'soundscapes':
            try:
                self.reply = self.command.soundscapes_handler.handle_response(
                    sub_cat, action)
                # self.tts(self.reply)
                self.reset_loop()
            except BaseException as e:
                print(e)
                self.conversation_app()

        elif cat == 'wolfram':
            try:
                self.reply = self.command.wolfram_handler.handle_response(
                    self.command, sub_cat, self.prompt)
                print(f'\nWolfram Reply len: `{len(self.reply)}`\n')
                if len(self.reply) > 0 and len(self.reply) < 99:
                    self.tts(self.reply)
                    self.reset_loop()
                else:
                    self.conversation_app()
            except BaseException as e:
                print(e)
                self.conversation_app()

        elif cat == 'conv':  # send to conversation handler

            self.conversation_app(action)

        elif cat == 'reset':
            self.reply = '[Resetting Conversation...]'
            self.command.reset_conversation()
            self.reset_loop()

        self.write_response_to_db()  # log self.reply

    def write_response_to_db(self):
        if not self.reply:
            self.reply = '[empty]'
        if self.reset_conversation:
            self.reset_conversation = False  # set back to False
            self.reply = ''
            return
        SQL = sqlite3.connect("ditto.db")
        cur = SQL.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS responses(response VARCHAR)")
        SQL.commit()
        cur.execute("INSERT INTO responses VALUES('%s')" %
                    self.reply.replace("'", "''"))
        SQL.commit()
        SQL.close()
        self.reply = ''  # reset for next loop

    def write_prompt_to_db(self):
        if self.reset_conversation:
            self.reply = ''
            return
        SQL = sqlite3.connect("ditto.db")
        cur = SQL.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS prompts(prompt VARCHAR)")
        SQL.commit()
        cur.execute("INSERT INTO prompts VALUES('%s')" %
                    self.prompt.replace("'", "''"))
        SQL.commit()
        SQL.close()

    def update_status_db(self, status):
        SQL = sqlite3.connect("ditto.db")
        cur = SQL.cursor()
        cur.execute("CREATE TABLE IF NOT EXISTS status(status VARCHAR)")
        SQL.commit()
        status_arr = cur.execute("SELECT * FROM status").fetchall()
        if len(status_arr) > 3:
            cur.execute("DELETE FROM status")
            SQL.commit()
        cur.execute("INSERT INTO status VALUES('%s')" % status)
        SQL.commit()
        SQL.close()

    def activation_sequence(self):
        self.activation_mode = True
        # record audio and listen for name
        self.speech.record_audio(activation_mode=self.activation_mode)
        if self.speech.activation.activate:  # name has been spoken

            if self.speech.reset_conversation:
                self.reset_conversation = True
            self.play_sound('on')
            self.speaker_timer = 0  # reset speaker + mic timer

            self.speech.activation.activate = False
            self.speech.text = ""
            self.speech.activation.text = ""

            self.activation_mode = False

            self.comm_timer_mode = True  # turn on timer
            # (can be used per application for detecting user idle to cancel)
            self.command_timer = 0
            # executes every n 'seconds' (used to handle back to idle)
            self.command_timeout_handler(60)

            # record audio and listen for command
            self.speech.record_audio(activation_mode=self.activation_mode)

            # command has been spoken (app on enter section)
            if self.comm_timer_mode:
                self.comm_timer.cancel()
                print("Q: %s\n" % self.speech.activation.text)
                self.speech.activation.activate = False
                self.speech.activation.text = ""

                # enter application handler ## (main loop)
                # while not self.activation_mode:
                try:
                    self.send_command()

                except BaseException as e:

                    print('\n[Unexpected Error: ]\n')
                    print(e)
                    self.reply = f"[Unexpected Error: {e}]"
                    self.tts('Unexpected Error... Please try again!')
                    self.reset_loop()

            else:
                self.speech.activation.activate = False  # back to idle ...
                self.speech.activation.text = ""
                # print('Canceling...')

    def command_timeout_handler(self, timeout):
        self.comm_timer = Timer(
            timeout, self.command_timeout_handler, [timeout])
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
            self.comm_timer_mode = False  # turn off timer
            self.reset_loop()
            self.speech.comm_timer_mode = False  # send to speech submodule for handling

    def tts(self, reply):
        if not self.speech.from_gui:  # only read reply aloud if command / prompt was spoken by user
            try:
                if UNIX:
                    os.system('amixer -q set Master ' +
                              str(self.speech_volume)+'%')
                # os.system('pico2wave -w reply.wav "%s" && aplay -q reply.wav' % prompt.strip("[]"))
                if not self.speech.offline_mode:
                    soundscapes = self.command.soundscapes_handler.soundscapes
                    if soundscapes.playing:
                        speaker = self.google.gtts(reply)
                        while speaker.running:
                            continue
                        soundscapes.play_sound(soundscapes.currently_playing)
                    else:
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
