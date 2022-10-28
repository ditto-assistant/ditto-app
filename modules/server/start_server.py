from server import Server
from gevent.pywsgi import WSGIServer
import subprocess
import socket 
from flask import g

class devnull:
    write = lambda _: None

def start_server():
    server = Server()
    subprocess.Popen(['python', 'ditto.py'])
    http_server = WSGIServer(('0.0.0.0', 42032), server.app, log=devnull)
    print('\n\n[Server started on port 42032]\n\n')
    http_server.serve_forever()

if __name__ == "__main__":
    start_server()
    
