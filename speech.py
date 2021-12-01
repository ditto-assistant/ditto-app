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

# local vosk
from modules.vosk_model.activation import Activation
from vosk import Model, KaldiRecognizer, SetLogLevel

# suppress Vosk logger
SetLogLevel(-1)

# pyaudio alternative for real-time stream (supported by Vosk)
import sounddevice as sd

import vosk
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
        self.vosk_model_dir = 'modules/vosk_model/model'
        self.fname = 'modules/vosk_model/command.wav'

    def callback(self, indata, frames, time, status):
        """This is called (from a separate thread) for each audio block."""
        if status:
            print(status)
        self.q.put(bytes(indata))

    def record_audio(self, activation_mode=False):
        chunk = 1024
        chan = 1
        self.rate = 16000


        self.recording = True
        with sd.RawInputStream(
            samplerate = self.rate,
            blocksize =chunk,
            # device=
            dtype='int16',
            channels=chan,
            callback=self.callback):
                if activation_mode: print('\nidle...\n')
                else: print('listening...\n')
                model = Model(self.vosk_model_dir)
                rec = KaldiRecognizer(model, self.rate)
                while True:
                    data = self.q.get()
                    if rec.AcceptWaveform(data):
                        # print(rec.Result())
                        self.text = json.loads(rec.Result())['text']
                        self.activation.text = self.text
                        self.activation.check_input(activation_mode)
                        if self.activation.activate:
                            self.recording = False
                            break
                    else:
                        self.partial_result = json.loads(rec.PartialResult())['partial']
                        # print(rec.PartialResult()) 

                    
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

    def process_audio_vosk(self):
        self.activation.input(self.fname, self.vosk_model_dir)
        self.text = self.activation.text

if __name__ == "__main__":
    s = Speech()
    s.record_audio(3)
    s.process_audio_vosk()
    # s.process_audio_google()