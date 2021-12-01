"""
Model trained to activate upon spoken word sequence.

author: Omar Barazanji

refs:
1) https://alphacephei.com/vosk/install
"""

from vosk import Model, KaldiRecognizer, SetLogLevel
import sys
import os
import wave
import json

# SetLogLevel(0)

class Activation:

    def __init__(self, name):
        self.name = name
        self.activate = False
        self.text = ''

    def input(self, fname, model_path):
        wf = wave.open(fname, "rb")

        model = Model(model_path)
        rec = KaldiRecognizer(model, wf.getframerate())
        rec.SetWords(True)
        while True:
            data = wf.readframes(4000)
            if len(data) == 0:
                break
            if rec.AcceptWaveform(data):
                self.text = json.loads(rec.Result())['text']
            else:
                self.partial_result = rec.PartialResult()
        self.final_result = rec.FinalResult()

    def check_input(self):
        if self.name in self.text:
            self.activate = True

    