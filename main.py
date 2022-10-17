import gevent.subprocess as subprocess

def start_server():
        '''
        Boots the Ditto Server for API calls.
        '''
        subprocess.call(['python', 'modules/server/start_server.py'])
        print('\n[Starting server...]')

if __name__ == "__main__":
    start_server()