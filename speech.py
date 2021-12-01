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

import pyaudio
import wave
import io

class Speech:

    def __init__(self):
        self.recording = False
        self.text = ""
        self.activation = Activation("ditto")
        self.fosk_model_dir = 'modules/vosk_model/model'
        self.fname = 'modules/vosk_model/command.wav'

    def record_audio(self, max_len_seconds=10):
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
        self.activation.input(self.fname, self.fosk_model_dir)
        self.text = self.activation.text

if __name__ == "__main__":
    s = Speech()
    s.record_audio(3)
    s.process_audio_vosk()
    # s.process_audio_google()