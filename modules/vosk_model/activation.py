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


class Activation:
    def __init__(self, name):
        self.name = name
        self.activate = False
        self.text = ""
        self.partial_text = ""

    # check self.text and decide whether or not to activate
    def check_input(self, activation_mode_on):
        if activation_mode_on:
            if self.name in self.text or self.name in self.partial_text:
                self.activate = True
        else:
            if not self.text == "":
                self.activate = True
