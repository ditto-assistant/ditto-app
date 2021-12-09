'''
pip install -r requirements.txt
...
pyaudio needs whl.
vosk needs extra script to unpack.
'''

import os

current_cir = os.getcwd()

os.system("pip install -r requirements.txt")
os.system("pip install resources/installer/py_audio_37_win.whl")
os.system('resources\\installer\\Hourglassinstaller.exe')
os.system("$client = new-object System.Net.WebClient")
os.system('$client.DownloadFile("https://alphacephei.com/kaldi/models/vosk-model-small-en-us-0.15.zip","%s\\modules\\vosk_model\\model.zip")'%current_cir)
os.system('tar -xf modules\\vosk_model\\model.zip')
