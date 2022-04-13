'''
Python 3.7 Rpi3 install script. 
create fresh venv on 3.7 for best results.
'''

import os
import platform

UNIX = False
if platform.system() == 'Linux' or platform.system() == 'Darwin':
    UNIX = True

os.system("pip install -r requirements.txt")
if not UNIX: 
    os.system("pip install pipwin")
    os.system("pipwin install pyaudio")
else:
    os.system("wget http://ftp.us.debian.org/debian/pool/non-free/s/svox/libttspico0_1.0+git20130326-9_armhf.deb")
    os.system("wget http://ftp.us.debian.org/debian/pool/non-free/s/svox/libttspico-utils_1.0+git20130326-9_armhf.deb")
    os.system("sudo apt-get install -f ./libttspico0_1.0+git20130326-9_armhf.deb ./libttspico-utils_1.0+git20130326-9_armhf.deb")
    os.system("wget https://github.com/alphacep/vosk-api/releases/download/v0.3.31/vosk-0.3.31-py3-none-linux_aarch64.whl")
    os.system("pip install vosk-0.3.31-py3-none-linux_aarch64.whl")
# os.system("cd resources/installer")
# os.system("pip install https://download.lfd.uci.edu/pythonlibs/w6tyco5e/PyAudio-0.2.11-cp37-cp37m-win_amd64.whl")
# os.system('resources\\installer\\Hourglassinstaller.exe')


# import dload
# dload.save_unzip("https://alphacephei.com/kaldi/models/vosk-model-small-en-us-0.15.zip", "modules/vosk_model")
# os.rename('modules\\vosk_model\\vosk-model-small-en-us-0.15', 'modules\\vosk_model\\model')

