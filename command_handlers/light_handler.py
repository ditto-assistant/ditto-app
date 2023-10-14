import json
from threading import Thread
import numpy as np
import requests
from config import AppConfig

# https://github.com/mclarkk/lifxlan
import lifxlan

import serial

from modules.home_assistant.home_assistant import HomeAssistant
from datetime import datetime
import time


class LightHandler:
    def __init__(self):
        self.config = AppConfig()
        self.nlp_base_url: str = self.config.base_url()
        self.ha_entities = self.config.ha_entities
        self.light_status = True
        self.light_mode = "on"
        self.home_assistant = HomeAssistant()
        self.stopped = False

    def handle_response(self, prompt, tts):
        Thread(target=self.handle_response_(prompt, tts), args=()).start()
        return self

    def toggle_ha_entity(self, command):
        entity_id = ""
        command = command.strip()
        if "day" in command:
            self.toggle_light("on")
            for i in self.ha_entities:
                if "day" in i:
                    entity_id = i
        elif "night" in command:
            self.toggle_light("red")
            for i in self.ha_entities:
                if "night" in i:
                    entity_id = i
        elif "sleep" in command:
            self.toggle_light("off")
            for i in self.ha_entities:
                if "sleep" in i:
                    entity_id = i
        if not entity_id:
            print("No ha_entities day mode entity found in resources/config.json...")
            return
        else:
            self.home_assistant.update_state(
                entity_id, {"state": str(datetime.fromtimestamp(time.time()))}
            )

    def prompt_ner_light(self, prompt):
        base_url = f"{self.nlp_base_url}/ner/light"
        response = requests.post(base_url, params={"prompt": prompt})
        return response.content.decode()

    def set_light_brightness(self, value, light_name=None):
        if light_name == "lights" or light_name == "light":  # led strip brightness
            self.toggle_light_brightness(value)
        else:  # all other lights
            self.home_assistant.send_google_sdk_command(
                f"set {light_name} brightness to {value}"
            )

    def toggle_light_color(self, color, light_name=None):
        if light_name == "lights" or light_name == "light":  # LED Light Strip handler
            self.toggle_light(color)

        else:  # all other lights
            self.home_assistant.send_google_sdk_command(f"set {light_name} to {color}")

    def toggle_light_power(self, mode, light_name=None):
        if light_name == "lights" or light_name == "light":  # LED Light handler
            self.toggle_light(mode)
        else:  # all other lights
            self.home_assistant.send_google_sdk_command(f"turn {mode} {light_name}")
        if light_name == "all lights":  # turn on/off leds too
            self.toggle_light(mode)
            self.home_assistant.send_google_sdk_command(f"turn {mode} {light_name}")

    def toggle_light_brightness(self, brightness):
        brightness = int(brightness)
        try:
            dev_path = self.config.teensy_path
            try:
                s = serial.Serial(dev_path, baudrate=9600, bytesize=8)
            except:
                print("\nFailed to connect to Teensy")
            if brightness == 0:
                s.write(b"\xF0")
            elif brightness == 1:
                s.write(b"\xF1")
            elif brightness == 2:
                s.write(b"\xF2")
            elif brightness == 3:
                s.write(b"\xF3")
            elif brightness == 4:
                s.write(b"\xF4")
            elif brightness == 5:
                s.write(b"\xF5")
            elif brightness == 6:
                s.write(b"\xF6")
            elif brightness == 7:
                s.write(b"\xF7")
            elif brightness == 8:
                s.write(b"\xF8")
            elif brightness == 9:
                s.write(b"\xF9")
            elif brightness == 10:
                s.write(b"\xFA")
            else:
                print("not a valid brightness command")
                self.light_mode = self.light_mode
        except BaseException as e:
            print("\nTeensy path not found in config")

    def toggle_light(self, mode):
        mode = mode.lower()
        try:
            dev_path = self.config.teensy_path
            try:
                s = serial.Serial(dev_path, baudrate=9600, bytesize=8)
            except:
                print("\nFailed to connect to Teensy")

            if mode == "on":
                self.light_status = True
                self.light_mode = mode
                s.write(b"\x00")
            elif mode == "off":
                self.light_status = False
                self.light_mode = mode
                s.write(b"\x01")
            elif mode == "sparkle":
                self.light_mode = mode
                s.write(b"\x02")
            elif mode == "mode 3":
                self.light_mode = mode
                s.write(b"\x03")
            elif mode == "mode 4":
                self.light_mode = mode
                s.write(b"\x04")
            elif mode == "mode 5":
                self.light_mode = mode
                s.write(b"\x05")
            elif mode == "white":
                self.light_mode = mode
                s.write(b"\x06")
            elif mode == "green":
                self.light_mode = mode
                s.write(b"\x07")
            elif mode == "orange":
                self.light_mode = mode
                s.write(b"\x08")
            elif mode == "blue":
                self.light_mode = mode
                s.write(b"\x09")
            elif mode == "red":
                self.light_mode = mode
                s.write(b"\x0A")
            elif mode == "yellow":
                self.light_mode = mode
                s.write(b"\x0B")
            elif mode == "purple":
                self.light_mode = mode
                s.write(b"\x0C")
            elif mode == "gradient":
                self.light_mode = mode
                s.write(b"\x0D")
            else:
                print("not a valid light mode")
                self.light_mode = self.light_mode
        except BaseException as e:
            print("\nTeensy path not found in config")

    def handle_response_(self, prompt, tts):
        self.running = True
        self.reply = ""
        try:
            ner_response = json.loads(self.prompt_ner_light(prompt))
            lightname = ner_response["lightname"].strip().replace("'", "")
            brightness = ner_response["brightness"].strip()
            color = ner_response["color"].strip()
            command = ner_response["command"].strip()
            reply = ""
            if command and lightname:
                if command == "dim":
                    reply = f"[Dimming the {lightname}]"
                    tts(reply)
                    self.set_light_brightness(brightness, lightname)
                elif "off" in command or "on" in command:
                    reply = f"[Turning {command} the {lightname}]"
                    if lightname == "all lights":
                        reply = reply.replace("the ", "")
                    tts(reply)
                    self.toggle_light_power(command, lightname)

            elif "night" in command or "day" in command or "sleep" in command:
                reply = f"[Setting house to {command} mode]"
                tts(reply)
                self.toggle_ha_entity(command)

            elif color and lightname:
                reply = f"[Setting {lightname} to {color}]"
                tts(reply)
                self.toggle_light_color(color, lightname)

            elif brightness and lightname:
                reply = f"[Setting {lightname} brightness to {brightness}]"
                tts(reply)
                if "%" in brightness:
                    brightness = int(brightness.replace("%", ""))
                self.set_light_brightness(int(brightness), lightname)

        # any errors come here
        except BaseException as e:
            print(e)
            reply = "[Light not found or invalid command]"

        print(reply + "\n")
        self.stopped = True
        self.reply = reply
        return
