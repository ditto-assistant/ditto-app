# for py_audio activation (offline method)
from vosk import Model, KaldiRecognizer, SetLogLevel
SetLogLevel(-1)
import sounddevice as sd
import sys
import queue
import json
q = queue.Queue()


class STT:

    def __init__(self, path):
        self.text = ''
        self.model_path = path

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
        with sd.RawInputStream(samplerate=16000, blocksize = 8000, device=0, dtype='int16',
        channels=1, callback=self.callback):
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

if __name__ == '__main__':
    speech_to_text = STT()
    speech_to_text.stt()