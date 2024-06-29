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

OS = "Windows"
if platform.system() == "Linux":
    OS = "Linux"
elif platform.system() == "Darwin":
    OS = "Darwin"


def activate_inject_prompt(prompt):
    SQL = sqlite3.connect("ditto.db")
    cur = SQL.cursor()
    cur.execute(
        "CREATE TABLE IF NOT EXISTS ditto_requests(request VARCHAR, action VARCHAR)"
    )
    SQL.commit()
    cur.execute(
        "INSERT INTO ditto_requests VALUES('prompt', '%s')"
        % prompt.replace('""', '"').replace("'", "''")
    )
    SQL.commit()
    SQL.close()


def get_status():
    SQL = sqlite3.connect("ditto.db")
    cur = SQL.cursor()
    status_arr = cur.execute("SELECT * FROM status").fetchall()
    status = status_arr[-1][0]
    # if status_arr is greater than 5, reset the table
    if len(status_arr) > 5:
        cur.execute("DELETE FROM status")
        SQL.commit()
    SQL.close()
    return status


def get_ditto_mic_status():
    SQL = sqlite3.connect("ditto.db")
    cur = SQL.cursor()
    mic_status = "off"
    status = cur.execute("SELECT * FROM ditto_status_table").fetchall()
    for stat in status:
        if "activation_mic" in stat:
            mic_status = stat[1]
    SQL.close()
    status = '{"ditto_mic_status": "%s"}' % mic_status
    return status


def send_ditto_wake():  # use to trigger activation and start GTTS audio transcript
    SQL = sqlite3.connect(f"ditto.db")
    cur = SQL.cursor()
    cur.execute(
        "CREATE TABLE IF NOT EXISTS ditto_requests(request VARCHAR, action VARCHAR)"
    )
    SQL.commit()
    cur.execute("INSERT INTO ditto_requests VALUES('activation', 'true')")
    SQL.commit()
    SQL.close()


def toggle_activation_mic():
    SQL = sqlite3.connect(f"ditto.db")
    cur = SQL.cursor()
    cur.execute(
        "CREATE TABLE IF NOT EXISTS ditto_requests(request VARCHAR, action VARCHAR)"
    )
    SQL.commit()
    cur.execute("INSERT INTO ditto_requests VALUES('toggleMic', 'true')")
    SQL.commit()
    SQL.close()


# making requests to the Ditto instance
@app.route("/ditto/", methods=["POST", "GET"])
def ditto_handler():
    requests = request.args

    try:
        if request.method == "POST":
            # Request to send prompt to ditto
            if "prompt" in requests:
                prompt = requests["prompt"]
                activate_inject_prompt(prompt)
                return '{"prompt": "%s"}' % prompt

            if "toggleMic" in requests:
                toggle_activation_mic()
                return '{"toggleMic": "success"}'

        elif request.method == "GET":
            if "status" in requests:
                status = get_status()
                return '{"status": "%s"}' % status

            if "dittoMicStatus" in requests:
                ditto_status = get_ditto_mic_status()
                return ditto_status

        else:
            return '{"error": "invalid"}'
    except BaseException as e:
        print(e)
        return '{"response": "error"}'


# Use Postman for POST Test and more!


@app.route("/", methods=["POST"])
def post_handler():
    return '{"server_status": "on"}'


class Server:
    def __init__(self):
        self.app = app


if __name__ == "__main__":
    server = Server()
