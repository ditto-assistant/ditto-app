# for py_audio activation (offline method)
from lib2to3.pytree import Base
import re
from vosk import Model, KaldiRecognizer, SetLogLevel
SetLogLevel(-1)
import sounddevice as sd
import sys
import queue
import json
q = queue.Queue()

import platform 


UNIX = False
if platform.system() == 'Linux':
    UNIX = True

class STT:

    def __init__(self, path):
        self.text = ''
        self.path = path+'/modules/vosk_model/'
        self.model_path = path+'/modules/vosk_model/model'
        self.device_id = self.get_sound_device_id()

    def load_config(self) -> str:
        '''
        Load config reads config.json for "device_name" and returns the mic name as a string.
        '''
        device_name = 'default'
        try:
            with open(self.path+'config.json', 'r') as f:
                stt_config = json.load(f)
                device_name = stt_config['device_name']
                print(f'\nUsing {device_name} as mic device.\n')
        except:
            print('\nDefault mic selected. No config.json found...\n')
        
        return device_name

    def get_sound_device_id(self) -> int:
        '''
        Returns configured sounddevice mic ndx as an integer.  
        '''
        device_id = 0
        device_name = self.load_config()
        device_list = sd.query_devices()
        for ndx,dev in enumerate(device_list):
            if device_name in dev:
                device_id = ndx
                break
        return device_id

    def callback(self, indata, frames, time, status):
        """This is called (from a separate thread) for each audio block."""
        if status:
            print(status, file=sys.stderr)
        q.put(bytes(indata))

    # decode and save to self.text
    def stt(self):
        print('   ,.,')
        print(' ((~"~))')
        print("'(|o_o|)'")
        print(",..\=/..,")
        print('listening...\n')
        while True:
            try:
                with sd.RawInputStream(samplerate=16000, blocksize = 8000, device=self.device_id, channels=1, dtype='int16', callback=self.callback):
                    model = Model(self.model_path)
                    rec = KaldiRecognizer(model, 16000)
                    # rec.SetWords(True)
                    while True:
                        data = q.get()
                        if rec.AcceptWaveform(data):
                            self.text = rec.Result()
                            self.text = json.loads(self.text)['text']
                            break
                        else:
                            pass
                            # print(rec.PartialResult())
                    break
            except BaseException as e:
                print(e)
                break

if __name__ == '__main__':
    speech_to_text = STT()
    speech_to_text.stt()