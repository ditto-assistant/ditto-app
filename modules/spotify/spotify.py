"""
Spotify application build around the Spotify Web API.

refs:
1) https://developer.spotify.com/documentation/general/guides/authorization/
2) https://github.com/plamere/spotipy
"""

import os
import json

import spotipy
from spotipy.oauth2 import SpotifyOAuth, SpotifyClientCredentials

from subprocess import Popen, PIPE

class Spotify():
    
    def __init__(self, path):
        
        self.path = path 
        # os.system(self.path.replace("/", "\\"))

        # first time set up (automated as much as possible)
        l = []
        for x in os.listdir(path):
            l.append(x)

        if not 'resources' in l:
            os.system('mkdir resources')

        l = []
        for x in os.listdir(path + '/resources'):
            l.append(x)
        if 'spotify' not in x:
            print('no spotify json found...')
            s = json.dumps({"client-id": "ID", "client-secret": "ID"})
            with open('resources/spotify.json', 'w') as f:
                f.write(s)
            print('created spotify.json in resources/')
            print('please fill in client app IDs')
            exit()
        
        with open(path +'/resources/spotify.json') as f:
            s = ""
            for x in f.readlines():
                s += x
        self.user_values = json.loads(s)
    
    def play_spotify(self, uri):
        scope = "user-read-playback-state,user-modify-playback-state"
        sp = spotipy.Spotify(
            client_credentials_manager = SpotifyOAuth(
                client_id = self.user_values["client-id"],
                client_secret = self.user_values["client-secret"],
                scope=scope,
                redirect_uri='http://127.0.0.1:8123/'
            )                
        )
        try:
            sp.start_playback(uris=[uri], device_id=0)
            return 1
        except:
            print("invalid uri: %s" % uri)
            return -1

    def get_uri_spotify(self, artist, song=None):
        # wake up spotify
        # path = self.path.replace("/","\\") + '\\resources\\spotify_shortcut.lnk'
        # os.system(path)

        sp = spotipy.Spotify(
            auth_manager=SpotifyClientCredentials(
                client_id = self.user_values["client-id"],
                client_secret = self.user_values["client-secret"],
            )
        )
        try:
            results = sp.search(q=artist, limit=30) # change limit for more results
            for idx, track in enumerate(results['tracks']['items']): 
                if song == None: return track['uri']
                if song.lower() in track['name'].lower():
                    return track['uri']
        except:
            print('invalid search')
            return -1
    

if __name__ == "__main__":
    spotify_app = Spotify(os.getcwd())
    uri = spotify_app.get_uri_spotify("False Jasmine", "gravity")
    spotify_app.play_spotify(uri)