import sqlite3
from server import Server
from gevent.pywsgi import WSGIServer
import subprocess
import socket 
from flask import g

class devnull:
    write = lambda _: None

def update_status_db(status):
    SQL = sqlite3.connect("ditto.db")
    cur = SQL.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS status(status VARCHAR)")
    SQL.commit()
    cur.execute("INSERT INTO status VALUES('%s')" % status)
    SQL.commit()
    SQL.close()

def start_server():
    update_status_db('off') # set ditto to off (initial state)
    server = Server()
    subprocess.Popen(['python', 'ditto.py']) # Ditto Main Loop
    subprocess.Popen(['gui.bat'])
    # subprocess.Popen(['python', 'modules/gesture-recognition/main.py', 'production']) # Start gesture recognition sub-porocess
    http_server = WSGIServer(('0.0.0.0', 42032), server.app, log=devnull)
    print('\n\n[Server started on port 42032]\n\n')
    http_server.serve_forever()

if __name__ == "__main__":
    start_server()
    
