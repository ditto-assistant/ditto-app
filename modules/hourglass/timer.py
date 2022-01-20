"""
Makes use of Hourglass, a simple open source windows Timer app with command line capabilities.

author: Omar Barazanji

ref:
1) https://chris.dziemborowicz.com/apps/hourglass/
"""

import os
import sys

from subprocess import Popen

# NEEDS TO BE REFACTORED FOR RPI3 / LINUX :)

class Timer:
    
    def __init__(self):
        self.default_path = '/home/pi/assistant/resources/sounds/beep.mp3'
        pass

    def set_timer(self, val):
        try:
            os.system('termdown %s && mpg321 -q %s' % (val, self.default_path))
        except:
            pass
        pass
        

if __name__ == "__main__":
    timer = Timer()
    timer.set_timer('1s')
