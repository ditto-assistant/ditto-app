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
        # self.default_path = 'C:\\Program Files (x86)\\Hourglass\\Hourglass.exe'
        # self.custom_path = ''
        pass

    def set_timer(self, val):
        # try:
        #     Popen([self.default_path,'-e', "on", val], shell=False)
        # except:
        #     pass
        pass

if __name__ == "__main__":
    timer = Timer()
    timer.set_timer('5 seconds')
