import os
from modules.pico_python.picovoice_demo_mic import pico_wake

import socket

def start_pico():
    pico = pico_wake(os.getcwd())
    pico.run()

def send_ping():
    HOST = '192.168.1.3' 
    PORT = 42042

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect((HOST, PORT))
        s.sendall(b"Hey Ditto")

if __name__ == "__main__":
    pass