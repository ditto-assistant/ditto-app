"""
Makes use of Hourglass, a simple open source windows Timer app with command line capabilities.

author: Omar Barazanji

ref:
1) https://chris.dziemborowicz.com/apps/hourglass/
"""

import os
import sys

from subprocess import Popen

class Timer:
    
    def __init__(self, path):
        self.default_path = path + '/resources/sounds/beep.mp3'
        self.process_path = path + '/modules/hourglass/process.py'
        pass

    def set_timer(self, val):
        try:
            Popen(['python', self.process_path, val, self.default_path])
        except:
            pass
        pass
        

if __name__ == "__main__":
    timer = Timer()
    timer.set_timer('1s')
