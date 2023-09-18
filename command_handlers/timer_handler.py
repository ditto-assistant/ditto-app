import json
import requests

from modules.hourglass.timer import Timer
from config import AppConfig


class TimerHandler:
    def __init__(self, path):
        self.timer = Timer(path)
        self.nlp_base_url = AppConfig().base_url()

    def prompt_ner_timer(self, prompt):
        base_url = f"{self.nlp_base_url}/ner/timer"
        response = requests.post(base_url, params={"prompt": prompt})
        return response.content.decode()

    def toggle_timer(self, val):
        try:
            self.timer.set_timer(val)
        except BaseException as e:
            print(e)

    def handle_response(self, prompt):
        ner_response = json.loads(self.prompt_ner_timer(prompt))
        second = ner_response["second"]
        minute = ner_response["minute"]
        second_reply = ""
        minute_reply = ""
        s = ""
        m = ""

        if not second == "":
            s = "s"
            if int(second) == 1:
                second_reply = " second "
            else:
                second_reply = " seconds "

        if not minute == "":
            m = "m"
            if int(minute) == 1:
                minute_reply = " minute "
            else:
                minute_reply = " minutes "

        if not second == "" or not minute == "":
            timer_command = minute + m + second + s
            timer_command.replace(" ", "")
            # print(timer_command)
            self.toggle_timer(timer_command)
            readable = minute + minute_reply + second + second_reply
            reply = "[Setting timer for %s]" % readable
            print(reply + "\n")

        else:
            reply = "[Invalid timer command]"
            print(reply + "\n")

        return reply
