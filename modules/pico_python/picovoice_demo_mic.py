#
# Copyright 2020-2021 Picovoice Inc.
#
# You may not use this file except in compliance with the license. A copy of the license is located in the "LICENSE"
# file accompanying this source.
#
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
# an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#

import argparse
from email.mime import audio
import json
import os
import sys
import struct
import wave
from threading import Thread

import numpy as np
from picovoice import *
from pvrecorder import PvRecorder

import platform 
UNIX = False
operating_system = platform.system()
if operating_system == 'Linux' or operating_system == 'Darwin':
    UNIX = True



class PicovoiceDemo(Thread):
    def __init__(
            self,
            access_key,
            audio_device_index,
            keyword_path,
            context_path,
            porcupine_library_path=None,
            porcupine_model_path=None,
            porcupine_sensitivity=0.7,
            rhino_library_path=None,
            rhino_model_path=None,
            rhino_sensitivity=0.7,
            require_endpoint=True,
            output_path=None):
        super(PicovoiceDemo, self).__init__()

        try:
            self._picovoice = Picovoice(
                access_key=access_key,
                keyword_path=keyword_path,
                wake_word_callback=self._wake_word_callback,
                context_path=context_path,
                inference_callback=self._inference_callback,
                porcupine_library_path=porcupine_library_path,
                porcupine_model_path=porcupine_model_path,
                porcupine_sensitivity=porcupine_sensitivity,
                rhino_library_path=rhino_library_path,
                rhino_model_path=rhino_model_path,
                rhino_sensitivity=rhino_sensitivity,
                require_endpoint=require_endpoint)
        except PicovoiceInvalidArgumentError as e:
            # print("One or more arguments provided to Picovoice is invalid: {\n" +
            #       f"\t{access_key=}\n" +
            #       f"\t{keyword_path=}\n" +
            #       f"\t{self._wake_word_callback=}\n" +
            #       f"\t{context_path=}\n" +
            #       f"\t{self._inference_callback=}\n" +
            #       f"\t{porcupine_library_path=}\n" +
            #       f"\t{porcupine_model_path=}\n" +
            #       f"\t{porcupine_sensitivity=}\n" +
            #       f"\t{rhino_library_path=}\n" +
            #       f"\t{rhino_model_path=}\n" +
            #       f"\t{rhino_sensitivity=}\n" +
            #       f"\t{require_endpoint=}\n" +
            #       "}")
            print(f"If all other arguments seem valid, ensure that '{access_key}' is a valid AccessKey")
            raise e
        except PicovoiceActivationError as e:
            print("AccessKey activation error")
            raise e
        except PicovoiceActivationLimitError as e:
            print(f"AccessKey '{access_key}' has reached it's temporary device limit")
            raise e
        except PicovoiceActivationRefusedError as e:
            print(f"AccessKey '{access_key}' refused")
            raise e
        except PicovoiceActivationThrottledError as e:
            print(f"AccessKey '{access_key}' has been throttled")
            raise e
        except PicovoiceError as e:
            print("Failed to initialize Picovoice")
            raise e

        self.audio_device_index = audio_device_index
        self.output_path = output_path

    @staticmethod
    def _wake_word_callback():
        # print('[wake word]\n')
        # sys.stdout.write('\b' * 2)
        dummy = [1,2]
        num=0
        num+=2
        err =dummy[num]
        



    @staticmethod
    def _inference_callback(inference):
        pass

    def run(self):
        self.recorder = None
        self.wav_file = None
        self.running = True
        try:
            self.recorder = PvRecorder(device_index=self.audio_device_index, frame_length=self._picovoice.frame_length)
            self.recorder.start()

            if self.output_path is not None:
                self.wav_file = wave.open(self.output_path, "w")
                self.wav_file.setparams((1, 2, 16000, 512, "NONE", "NONE"))

            # print(f"Using device: {self.recorder.selected_device}")
            print('\nidle...\n')

            while True:
                if not self.running: # used for rebooting picovoice (to fix mic sleep bug)
                    dummy = [1,2]
                    num=0
                    num+=2
                    err =dummy[num]
                    
                pcm = self.recorder.read()
                
                if self.wav_file is not None:
                    self.wav_file.writeframes(struct.pack("h" * len(pcm), *pcm))

                self._picovoice.process(pcm)

        except IndexError:
            sys.stdout.write('\b' * 2)
            # print('Stopping ...')
        finally:
            if self.recorder is not None:
                self.recorder.delete()

            if self.wav_file is not None:
                self.wav_file.close()

            self._picovoice.delete()

    @classmethod
    def show_audio_devices(cls):
        devices = PvRecorder.get_audio_devices()

        for i in range(len(devices)):
            print(f'index: {i}, device name: {devices[i]}')


def pico_wake(path):
    config_path = path+'/modules/pico_python/config.json'
    key_path = path+'/modules/pico_python/key.json'
    try:
        with open(config_path, 'r') as f:
            dev = json.load(f)
    except:
        print("default dev selected")
        dev = dict()
        dev['dev'] = 'default'
        with open(config_path, 'w') as f:
            f.write('{"dev":"default"}')
    try:
        with open(key_path, 'r') as f:
            key = json.load(f)
    except:
        print("blank pico key... fill out 'key.json' with working key")
        with open(key_path, 'w') as f:
            f.write('{"key":""}')

    access_key = key['key']
    devices = PvRecorder.get_audio_devices()
    audio_device_index=0
    for i in range(len(devices)):
        if dev['dev'] in devices[i]:
            audio_device_index=i
        if dev['dev'] == 'default':
            audio_device_index=0
        
    if operating_system=='Linux':            
        keyword_path = path+"/modules/pico_python/hey-ditto_en_raspberry-pi_v2_1_0.ppn"
        context_path = path+"/modules/pico_python/ditto_en_raspberry-pi_v2_1_0.rhn"
    elif operating_system=='Darwin':
        keyword_path = path+"/modules/pico_python/hey-ditto_en_mac_v2_1_0.ppn"
        context_path = path+"/modules/pico_python/ditto_en_mac_v2_1_0.rhn"
    else:
        keyword_path = path+"\\modules\\pico_python\\hey-ditto_en_windows_v2_1_0.ppn"
        context_path = path+"\\modules\\pico_python\\ditto_en_windows_v2_1_0.rhn"
        
    pico = PicovoiceDemo(
        access_key=access_key,
        audio_device_index=audio_device_index,
        keyword_path=keyword_path,
        context_path=context_path)
    return pico
        

if __name__ == '__main__':
    pass
