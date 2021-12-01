"""
Combines speech to text and gpt3 api to make commands.

author: Omar Barazanji
"""

from speech import Speech
from command import Command

class Assistant:

    def __init__(self):
        self.speech = Speech()
        self.command = Command()
        self.prompt = ""

    def get_speech(self):
        pass

    def activation_sequence(self):
        self.speech.record_audio(3)
        self.speech.process_audio_vosk()
        self.speech.activation.check_input()
        if self.speech.activation.activate:
            print('activation success')
            self.speech.activation.activate = False

if __name__ == "__main__":
    assistant = Assistant()
    while True:
        assistant.activation_sequence()

    # assistant.command(text)