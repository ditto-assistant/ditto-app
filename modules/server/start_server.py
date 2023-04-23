import sqlite3
from server import Server
from gevent.pywsgi import WSGIServer
import subprocess
import socket
from flask import g
import json


class devnull:
    def write(_): return None


def get_micname_from_config():
    try:
        config = json.load(open('resources/config.json', 'r'))
        mic = config['microphone']
    except BaseException as e:
        print('\nError loading mic name from resources/config.json ...\n')
        print(e)
    return mic


def update_status_db(status):
    SQL = sqlite3.connect("ditto.db")
    cur = SQL.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS status(status VARCHAR)")
    SQL.commit()
    cur.execute("INSERT INTO status VALUES('%s')" % status)
    SQL.commit()
    SQL.close()


def start_server():
    update_status_db('off')  # set ditto to off (initial state)
    micname = get_micname_from_config()
    server = Server()
    subprocess.Popen(['python', 'ditto.py'])  # Ditto Main Loop
    # Ditto Activation
    subprocess.Popen(
        ['python', 'modules/ditto_activation/main.py', 'modules/ditto_activation/', micname])
    # subprocess.Popen(['python', 'modules/gesture-recognition/main.py', 'production']) # Start gesture recognition sub-porocess
    http_server = WSGIServer(('0.0.0.0', 42032), server.app, log=devnull)
    print('\n\n[Server started on port 42032]\n\n')
    http_server.serve_forever()


if __name__ == "__main__":
    start_server()
