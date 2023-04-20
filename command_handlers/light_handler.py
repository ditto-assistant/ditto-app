import json
import numpy as np
import requests

# https://github.com/mclarkk/lifxlan
import lifxlan

import serial

from modules.home_assistant.home_assistant import HomeAssistant


class LightHandler():

    def __init__(self, config):
        self.config = config
        self.nlp_ip = config['nlp-server']
        self.light_status = True
        self.light_mode = 'on'
        self.home_assistant = HomeAssistant()

    
    def prompt_ner_light(self, prompt):
        base_url = f"http://{self.nlp_ip}:32032/ner/"
        response = requests.post(base_url, params={"ner-light": prompt})
        return response.content.decode()

    def set_light_brightness(self, value, light_name=None):
        if light_name=='lights' or light_name=='light': # led strip brightness
            self.toggle_light_brightness(value)
        else: # all other lights
            self.home_assistant.send_google_sdk_command(f'set {light_name} brightness to {value}')

    def toggle_light_color(self, color, light_name=None):            
        if light_name=='lights' or light_name=='light': # LED Light Strip handler
            self.toggle_light(color)

        else: # all other lights
            self.home_assistant.send_google_sdk_command(f'set {light_name} to {color}')

    def toggle_light_power(self, mode, light_name=None):
        if light_name=='lights' or light_name=='light': # LED Light handler
            self.toggle_light(mode)
        else: # all other lights
            self.home_assistant.send_google_sdk_command(f'turn {mode} {light_name}')
        if light_name=='all lights': # turn on/off leds too
            self.toggle_light(mode)
            self.home_assistant.send_google_sdk_command(f'turn {mode} {light_name}')
        
    def toggle_light_brightness(self, brightness):
        brightness = int(brightness)
        try:
            dev_path = self.config['teensy_path']
            try:
                s = serial.Serial(dev_path, baudrate=9600, bytesize=8)
            except:
                print('\nFailed to connect to Teensy')
            if brightness == 0:
                s.write(b'\xF0')
            elif brightness == 1:
                s.write(b'\xF1')
            elif brightness == 2:
                s.write(b'\xF2')
            elif brightness == 3:
                s.write(b'\xF3')
            elif brightness == 4:
                s.write(b'\xF4')
            elif brightness == 5:
                s.write(b'\xF5')
            elif brightness == 6:
                s.write(b'\xF6')
            elif brightness == 7:
                s.write(b'\xF7')
            elif brightness == 8:
                s.write(b'\xF8')
            elif brightness == 9:
                s.write(b'\xF9')
            elif brightness == 10:
                s.write(b'\xFA')
            else:
                print('not a valid brightness command')
                self.light_mode = self.light_mode
        except BaseException as e:
            print('\nTeensy path not found in config')

    def toggle_light(self, mode):
        mode = mode.lower()
        try:
            dev_path = self.config['teensy_path']
            try:
                s = serial.Serial(dev_path, baudrate=9600, bytesize=8)
            except:
                print('\nFailed to connect to Teensy')

            if mode == 'on':
                self.light_status = True
                self.light_mode = mode
                s.write(b'\x00')
            elif mode == 'off':
                self.light_status = False
                self.light_mode = mode
                s.write(b'\x01')
            elif mode == 'sparkle':
                self.light_mode = mode
                s.write(b'\x02')
            elif mode == 'mode 3':
                self.light_mode = mode
                s.write(b'\x03')
            elif mode == 'mode 4':
                self.light_mode = mode
                s.write(b'\x04')
            elif mode == 'mode 5':
                self.light_mode = mode
                s.write(b'\x05')
            elif mode == 'white':
                self.light_mode = mode
                s.write(b'\x06')
            elif mode == 'green':
                self.light_mode = mode
                s.write(b'\x07')
            elif mode == 'orange':
                self.light_mode = mode
                s.write(b'\x08')
            elif mode == 'blue':
                self.light_mode = mode
                s.write(b'\x09')
            elif mode == 'red':
                self.light_mode = mode
                s.write(b'\x0A')
            elif mode == 'yellow':
                self.light_mode = mode
                s.write(b'\x0B')
            elif mode == 'purple':
                self.light_mode = mode
                s.write(b'\x0C')
            elif mode == 'gradient':
                self.light_mode = mode
                s.write(b'\x0D')
            else:
                print('not a valid light mode')
                self.light_mode = self.light_mode
        except BaseException as e:
            print('\nTeensy path not found in config')


    def handle_response(self, prompt):
        try:
            ner_response = json.loads(self.prompt_ner_light(prompt))
            lightname = ner_response['lightname'].strip().replace("'", '')
            brightness = ner_response['brightness'].strip()
            color = ner_response['color'].strip()
            command = ner_response['command'].strip()
            reply = ''
            if command and lightname:
                if command == 'dim':
                    self.set_light_brightness(brightness, lightname)
                    reply = f'[Dimming the {lightname}]'
                else:
                    self.toggle_light_power(command, lightname)
                    reply = f'[Turning {command} the {lightname}]' 
                    if lightname == 'all lights': reply = reply.replace('the ','')
            
            elif color and lightname:
                self.toggle_light_color(color, lightname)
                reply = f'[Setting {lightname} to {color}]'
            
            elif brightness and lightname:
                if "%" in brightness:
                    brightness = int(brightness.replace("%","")) 
                self.set_light_brightness(int(brightness), lightname)
                reply = f"[Setting {lightname} brightness to {brightness}]"

                                                    
        # any errors come here
        except BaseException as e:
            print(e)
            reply = '[Light not found or invalid command]'
                    
        print(reply+'\n')

        return reply
