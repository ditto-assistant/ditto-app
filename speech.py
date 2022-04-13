"""
Uses Google's Speech-to-Text API to handle speech input from Mic and output text.

author: Omar Barazanji

refrences:
1) https://cloud.google.com/speech-to-text/docs/libraries#client-libraries-install-python
2) https://www.thepythoncode.com/article/play-and-record-audio-sound-in-python

notes:
1) run the followng to setup:
    $env:GOOGLE_APPLICATION_CREDENTIALS="path_to_google_api_json"
"""

# google cloud
from google.cloud import speech
from google_transcript import Google
import os
import sys
from threading import Timer

# local vosk
from modules.vosk_model.activation import Activation
# from vosk import Model, KaldiRecognizer, SetLogLevel

# local picovoice - replacing vosk :-)
from modules.pico_python.picovoice_demo_mic import pico_wake

# suppress Vosk logger
# SetLogLevel(-1)

# pyaudio alternative for real-time stream (supported by Vosk)
import sounddevice as sd

# used to send keypress event (keeps display on)
import pyautogui
pyautogui.FAILSAFE = False

import json
import queue
import pyaudio
import wave
import io

class Speech:

    def __init__(self):
        self.recording = False
        self.q = queue.Queue()
        self.text = ""
        self.activation = Activation("ditto")
        self.google_instance = Google()
        self.vosk_model_dir = 'modules/vosk_model/model'
        self.fname = 'modules/vosk_model/command.wav'
        self.comm_timer_mode = False
        self.idle_loop_count = 0
        self.skip_wake = False

        self.wake = 1
        self.speaker_timer_mode = True # set to keep speaker from sleeping
        self.speaker_timer = 0
        

    def callback(self, indata, frames, time, status):
        """This is called (from a separate thread) for each audio block."""
        if status:
            print(status)
        self.q.put(bytes(indata))

    def record_audio(self, activation_mode=False):
        self.recording = True
        try:
            if activation_mode and self.skip_wake == False:

                # picovoice method
                self.pico = pico_wake(os.getcwd())
                self.speaker_mic_timeout_handler(300)
                self.pico.run()
                if self.wake: # set to 0 in timer if idle reboot
                    self.activation.activate = True
                    self.recording = False
                    pyautogui.press('ctrl') # turn display on if asleep
                else:
                    self.wake = 1
                    print('rebooting picovoice!')

            else:
                if not self.comm_timer_mode and activation_mode: 
                    self.idle_loop_count += 1
                    if self.idle_loop_count ==1 :print('\nidle...\n')
                else:
                    self.idle_loop_count = 0
                    self.skip_wake = False
                    self.text = self.google_instance.grab_prompt()
                    self.activation.text = self.text
                    self.activation.check_input(activation_mode)
                    if self.activation.activate:
                        self.recording = False
        except BaseException as e:
            print(e)
            self.recording = False
            
    def speaker_mic_timeout_handler(self, timeout):
        self.speak_timer = Timer(timeout, self.speaker_mic_timeout_handler, [timeout])
        self.speak_timer.start()
        if self.speaker_timer_mode: 
            self.speaker_timer += 1
        if self.speaker_timer == timeout:
            self.speaker_timer = 0
            self.speak_timer.cancel()
            self.pico.running = False
            self.wake = 0

        # not used (leaving hooks for other purposes)       
        def record_pyaudio(self, max_len_seconds=10):
            chunk = 1024
            fmt = pyaudio.paInt16
            chan = 1
            self.rate = 16000

            p = pyaudio.PyAudio()

            print('recording...')

            self.recording = True
            stream = p.open(
                format=fmt, 
                channels=chan, 
                rate=self.rate, 
                input=self.recording, 
                frames_per_buffer=chunk
            )
            
            frames = []

            for x in range(0, int(self.rate / chunk*max_len_seconds)):
                data = stream.read(chunk)
                frames.append(data)

                if not self.recording:
                    break
            
            stream.stop_stream()
            stream.close()
            p.terminate()

            print('done.')

            wf = wave.open(self.fname, 'wb')
            wf.setnchannels(chan)
            wf.setsampwidth(p.get_sample_size(fmt))
            wf.setframerate(self.rate)
            wf.writeframes(b''.join(frames))
            wf.close()

        # not used (leaving hooks for other purposes)  
        def process_audio_google(self):
            with io.open(self.fname, "rb") as audio_file:
                content = audio_file.read()
            client = speech.SpeechClient()
            audio = speech.RecognitionAudio(content=content)
            config = speech.RecognitionConfig( 
                encoding = speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz = self.rate,
                language_code = "en-US"
            )
            response = client.recognize(config=config, audio=audio)

            for result in response.results:
                print('\n')
                print("Transcript: {}".format(result.alternatives[0].transcript))
                self.text = "{}".format(result.alternatives[0].transcript)

    # not used (leaving hooks for other purposes)  
    def process_audio_vosk(self):
        self.activation.input(self.fname, self.vosk_model_dir)
        self.text = self.activation.text

if __name__ == "__main__":
    s = Speech()
