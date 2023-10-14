import platform
import os

OS = "Windows"
if platform.system() == "Linux":
    OS = "Linux"
elif platform.system() == "Darwin":
    OS = "Darwin"

os.system("pip install -r requirements.txt")

if OS == "Windows":
    os.system("pip install pyaudio")
    # os.system('pip install pipwin')
    # os.system('pipwin install pyaudio')

elif OS == "Darwin":
    os.system("brew install portaudio")
    os.system("pip install pyaudio")

else:  # Linux
    os.system("sudo apt-get install portaudio19-dev")
    os.system("pip install pyaudio")
