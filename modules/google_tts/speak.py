"""Synthesizes speech from the input string of text or ssml.
Make sure to be working in a virtual environment.

Note: ssml must be well-formed according to:
    https://www.w3.org/TR/speech-synthesis/
"""
from google.cloud import texttospeech
import pygame

class Speak:

    def __init__(self): 

        # Instantiates a client
        self.client = texttospeech.TextToSpeechClient()


        # Build the voice request, select the language code ("en-US") and the ssml
        # voice gender ("neutral")
        self.voice = texttospeech.VoiceSelectionParams(
            language_code="en-US", ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
        )

        # Select the type of audio file you want returned
        self.audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3
        )

    def tts(self, prompt):
        # Set the text input to be synthesized
        synthesis_input = texttospeech.SynthesisInput(text=prompt)

        # Perform the text-to-speech request on the text input with the selected
        # voice parameters and audio file type
        response = self.client.synthesize_speech(
            input=synthesis_input, voice=self.voice, audio_config=self.audio_config
        )

        # The response's audio_content is binary.
        with open("output.mp3", "wb") as out:
            # Write the response to the output file.
            out.write(response.audio_content)

        pygame.mixer.init()
        pygame.mixer.music.load('output.mp3')
        pygame.mixer.music.play()
        while pygame.mixer.music.get_busy() == True:
            continue
    
if __name__=="__main__":
    speak = Speak()
    speak.tts("yo")