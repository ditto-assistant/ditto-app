"""
Combines speech to text and gpt3 api to make commands.

author: Omar Barazanji
"""

# handles text to speech
# run the following to install text to speech (windows):
#    ...python_install\Scripts\pywin32_postinstall.py -install
# https://stackoverflow.com/questions/22490233/win32com-import-error-python-3-4
import pyttsx

from speech import Speech
from command import Command

class Assistant:

    def __init__(self):
        self.speech = Speech()
        self.command = Command()
        self.speech_engine = pyttsx.init()
        self.prompt = ""
        self.reply = ""
        self.application = "model-selector"
        self.activation_mode = True


    def send_command(self):

        if self.application == 'light-application': # light application logic
            self.command.send_request(self.prompt, self.application)
            self.speech.text = ""
            self.speech.activation.text = ""
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
            self.speech.text = ""
            self.speech.activation.text = ""
            self.command_response = self.command.response.choices.copy().pop()['text'].split('\nA: ')[1]
            if 'toggle-conversation' in self.command_response:
                reply = self.command_response.strip("toggle-conversation `").strip("`")
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
                self.activation_mode = True # go back to idle...
                self.application = 'model-selector'
            else:
                print('invalid reply')
                self.activation_mode = True # go back to idle...
                self.application = 'model-selector'

            self.speech_engine.say(self.reply)
            self.speech_engine.runAndWait()
            self.reply = ""

        elif self.application == "timer-application":
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
            if self.speech.activation.activate: # command has been spoken
                print('sending request to GPT3')
                self.speech.activation.activate = False

                ## enter application handler ## (main loop)
                while not self.activation_mode:
                    self.send_command()

                
            else: print('Canceling...')
                

if __name__ == "__main__":
    assistant = Assistant()
    while True:
        assistant.activation_sequence()
