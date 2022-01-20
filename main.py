"""
Combines speech to text and gpt3 api to make commands.

author: Omar Barazanji
"""

# handles text to speech
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

class Assistant:

    def __init__(self):
        self.speech = Speech()
        self.command = Command(os.getcwd())
        self.speech_engine = pyttsx3.init()
        self.speech_engine.setProperty('voice', 'english')
        self.speech_engine.setProperty('rate', 190)
        self.speech_volume = 70 # percent
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
         

        self.speaker_timer_mode = True # set to keep speaker from sleeping
        self.speaker_timer = 0
        self.speaker_mic_timeout_handler(20)

    def send_command(self): # application logic

        if self.application == 'light-application': # light application logic
            self.command.send_request(self.prompt+'.', self.application)
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
                elif 'white' in self.command_response:
                    self.command.toggle_light('white')
                    self.reply = '[Setting lights to white]'
                    print(self.reply)
                    self.activation_mode = True # go back to idle...
                    self.application = 'model-selector'
                elif 'green' in self.command_response:
                    self.command.toggle_light('green')
                    self.reply = '[Setting lights to green]'
                    print(self.reply)
                    self.activation_mode = True # go back to idle...
                    self.application = 'model-selector'
                elif 'orange' in self.command_response:
                    self.command.toggle_light('orange')
                    self.reply = '[Setting lights to orange]'
                    print(self.reply)
                    self.activation_mode = True # go back to idle...
                    self.application = 'model-selector'
                elif 'blue' in self.command_response:
                    self.command.toggle_light('blue')
                    self.reply = '[Setting lights to blue]'
                    print(self.reply)
                    self.activation_mode = True # go back to idle...
                    self.application = 'model-selector'
                elif 'gradient' in self.command_response:
                    self.command.toggle_light('gradient')
                    self.reply = '[Setting lights to gradient]'
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

            # self.speech_engine.say(self.reply)
            # self.speech_engine.runAndWait()
            self.tts(self.reply, self.speech_volume)
            self.reply = ""

        elif self.application == "conversation-application": # conversation application logic
            self.command.send_request(self.prompt+'.', self.application)
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

            self.conv_timer.cancel() # reset conversation cooldown (turns on automatically on loop)
            self.speech.activation.activate = True # skip wake-up sequence (name is already called)
            self.speech.skip_wake = True
            self.speech.idle_loop_count = 1 # skip to listening... print out
            self.command_timer = 0 # reset command timer 
            self.comm_timer_mode = False # (pause to not iterrupt assistant speaking)
            self.comm_timer.cancel()

            # self.speech_engine.say(self.reply)
            # self.speech_engine.runAndWait()
            # while self.speech_engine.isBusy(): # wait until finished talking
            #     time.sleep(0.1)
            self.tts(self.reply, self.speech_volume)
            self.reply = ""

        elif self.application == "timer-application": # timer application logic
            self.command.send_request(self.prompt+".", self.application)
            self.speech.text = ""
            self.speech.activation.text = ""
            self.command_response = self.command.response.choices.copy().pop()['text'].split('\nA: ')[1]
            if 'toggle-timer' in self.command_response:
                reply = self.command_response.replace('toggle-timer `', '').strip('`') 
                self.reply = '[Setting timer for %s]' % reply.replace('s', ' seconds').replace('m', ' minute')
                print(self.reply)
                # self.speech_engine.say(self.reply)
                # self.speech_engine.runAndWait()
                self.tts(self.reply, self.speech_volume)
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
            try: 
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

                elif 'toggle-spotify-player' == cmd:
                    if reply == 'resume':
                        self.command.player.remote('resume')
                    elif reply == 'pause':
                        self.command.player.remote('pause')
                    elif reply == 'next':
                        self.command.player.remote('next')
                    elif reply == 'previous':
                        self.command.player.remote('previous')

                else:
                    print('invalid spotify command')

                # self.speech_engine.say(self.reply)
                # self.speech_engine.runAndWait()
                self.tts(self.reply, self.speech_volume)
                self.reply = ""
                self.activation_mode = True # go back to idle...
                self.application = 'model-selector'
            except:
                pass

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
                        # value doesn't exist in memory, grab value from conversation-application (if your)
                        if 'my' not in reply[0]: # don't let assistant make things up about user (my)
                            self.from_memory_read = (True, reply[0]) # save key for conversation app to forward back here for storage
                            print('forwarding from `memory-read` to `conversation` application')
                        self.prompt = self.speech.text
                        self.application = 'conversation-application'
                    if not self.application=='conversation-application':
                        if 'your' in reply[0]: # memory about itself ('your' always in key)
                            self.reply = ("[%s]" % value)
                        else: # memory about you ('my' always in key)
                            self.reply = ("["+reply[0] + " is %s]" % value).replace("my", "Your")
                        print(self.reply)
                if not self.application=='conversation-application':
                    # self.speech_engine.say(self.reply)
                    # self.speech_engine.runAndWait()
                    self.tts(self.reply, self.speech_volume)
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
            self.command.send_request(self.prompt+".", self.application)
            self.command_response = self.command.response.choices.copy().pop()['text'].strip(" ")

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

    def speaker_mic_timeout_handler(self, timeout):
        self.speak_timer = Timer(timeout, self.speaker_mic_timeout_handler, [timeout])
        self.speak_timer.start()
        if self.speaker_timer_mode: 
            self.speaker_timer += 1
        if self.speaker_timer == timeout:
            os.system('mpg321 -q resources/silence.mp3')
            self.speaker_timer = 0
            os.execv(sys.executable, ['python'] + sys.argv)

    def tts(self, prompt, volume_percent):
        os.system('amixer -q set Master ' + str(volume_percent)+'%')
        os.system('./resources/speech.sh "%s"' % prompt)
        
if __name__ == "__main__":

    assistant = Assistant()
    os.system('eval $(./resources/export.sh)')
    while True:
        assistant.activation_sequence()
