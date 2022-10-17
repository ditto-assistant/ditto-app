import platform
import re
import subprocess
import psutil
from flask import Flask
from flask import request
import json

import sqlite3
SQL = sqlite3.connect("ditto.db")

app = Flask(__name__)

OS = 'Windows'
if platform.system() == 'Linux':
    OS = 'Linux'
elif platform.system() == 'Darwin':
    OS = 'Darwin'


def write_prompt_to_db(prompt):
    cur = SQL.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS prompts (prompt)")

    prompt = prompt.replace('"',"")
    print(prompt)
    cur.execute("INSERT INTO prompts VALUES('%s')" % prompt)
    SQL.commit()

# making requests to the OmniSynth instance
@app.route("/ditto/", methods=['POST', 'GET'])
def ditto_handler():
    requests = request.args

    if request.method == "POST":
        if 'prompt' in requests:
            prompt = requests['prompt']
            write_prompt_to_db(prompt)
            return '{"prompt": %s}' % prompt
    else:
        return '{"error": "invalid"}'


# Use Postman for POST Test and more!
@app.route("/", methods=['POST'])
def post_handler():
    return '{"server_status": "on"}'


class Server():

    def __init__(self):
        self.app = app


if __name__ == "__main__":

    server = Server()
