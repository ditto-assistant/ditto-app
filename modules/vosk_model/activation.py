"""
Model trained to activate upon spoken word sequence.

author: Omar Barazanji

refs:
1) https://alphacephei.com/vosk/install
"""

import sys
import os
import wave
import json

# for py_audio activation (old method)
from vosk import Model, KaldiRecognizer, SetLogLevel
SetLogLevel(-1)


class Activation:

    def __init__(self, name):
        self.name = name
        self.activate = False
        self.text = ''

    # decode wave file and save to self.text
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

    # check self.text and decide whether or not to activate
    def check_input(self, activation_mode_on):
        if activation_mode_on:
            if self.name in self.text:
                self.activate = True
        else:
            if not self.text == "":
                self.activate = True

    