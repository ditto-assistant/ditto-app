import platform
import re
import subprocess
import psutil
from flask import Flask
from flask import request
from flask_cors import CORS

import json

import sqlite3
SQL = sqlite3.connect("ditto.db")

app = Flask(__name__)
CORS(app)

OS = 'Windows'
if platform.system() == 'Linux':
    OS = 'Linux'
elif platform.system() == 'Darwin':
    OS = 'Darwin'


def actiavte_inject_prompt(prompt):
    SQL = sqlite3.connect("ditto.db")
    cur = SQL.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS ditto_requests(request VARCHAR, action VARCHAR)")
    SQL.commit()
    cur.execute("INSERT INTO ditto_requests VALUES('prompt', '%s')" % prompt.replace('""','"').replace("'", "''"))
    SQL.commit()
    SQL.close()

def get_prompt_response_count():
    SQL = sqlite3.connect("ditto.db")
    cur = SQL.cursor()
    prompt_count = cur.execute("SELECT COUNT(*) FROM prompts").fetchone()[0]
    response_count = cur.execute("SELECT COUNT(*) FROM responses").fetchone()[0]
    SQL.close()
    return int(prompt_count) + int(response_count)

def get_conversation_history():
    SQL = sqlite3.connect("ditto.db")
    cur = SQL.cursor()
    req = cur.execute("SELECT * FROM prompts")
    prompts = req.fetchall()
    SQL.commit()
    cur.execute("SELECT * FROM responses")
    responses = req.fetchall()
    SQL.commit()
    SQL.close()
    def create_response_arrays(arr):
        response = dict()
        for ndx,x in enumerate(arr):
            response[str(ndx)] = x
        return json.dumps(response)
    return create_response_arrays(prompts), create_response_arrays(responses)

# making requests to the OmniSynth instance
@app.route("/ditto/", methods=['POST', 'GET'])
def ditto_handler():
    requests = request.args

    try:
        if request.method == "POST":

            # Request to send prompt to ditto
            if 'prompt' in requests:
                prompt = requests['prompt']
                actiavte_inject_prompt(prompt)
                return '{"prompt": "%s"}' % prompt

        elif request.method == "GET":

            # Request to get prompt + response history
            if 'history' in requests:
                prompts, responses = get_conversation_history()
                return '{"prompts": %s, "responses": %s}' % (prompts, responses)

            # Request prompt + response history count in database
            if 'historyCount' in requests:
                count = get_prompt_response_count()
                return '{"historyCount": %d}' % count


        else:
            return '{"error": "invalid"}'
    except BaseException as e:
        print(e)
        return '{"response": "error"}'

# Use Postman for POST Test and more!
@app.route("/", methods=['POST'])
def post_handler():
    return '{"server_status": "on"}'


class Server():

    def __init__(self):
        self.app = app


if __name__ == "__main__":

    server = Server()
