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

        # pre-save top songs for better context
        self.get_user_top_songs()

    
    def play_spotify(self, uri):
        device_id = 0
        scope = "user-read-playback-state,user-modify-playback-state"
        sp = spotipy.Spotify(
            client_credentials_manager = SpotifyOAuth(
                client_id = self.user_values["client-id"],
                client_secret = self.user_values["client-secret"],
                scope=scope,
                redirect_uri='http://127.0.0.1:8123'
            )                
        )
        self.devices = sp.devices()
        if self.devices['devices']==[]: # if no devices, default to previous used device ID
            if 'device-id' in self.user_values.keys(): # check if previous device exists
                device_id = self.user_values['device-id'] # grab id

        if 'device-id' in self.user_values.keys(): # devices exist, check for previous device
            device_id = self.user_values['device-id'] # grab id
        else: # register device (first time)
            device_id = self.devices['devices'][0]['id'] # grab id
            self.user_values['device-id'] = device_id
            with open(self.path+'\\resources\\spotify.json', 'w') as f: # store to json
                json.dump(self.user_values, f)

        try:
            sp.start_playback(uris=[uri], device_id=device_id)
            return 1
        except:
            print("invalid uri: %s" % uri)
            return -1


    def get_uri_spotify(self, artist, song=None):

        if self.top_songs:
            for track in self.top_songs:
                track_song = track[0].lower()
                track_artist = track[1].lower()
                if song==None and (artist.lower() in track_song or artist.lower() in track_artist):
                    print('found %s in top songs' % artist.title())
                    return track[2]
                if not song==None and artist.lower() in track_artist:
                    if song.lower() in track_song:
                        print('found %s by %s in top songs' % song.title(), artist.title())
                        return track[2]      

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
    
    def get_user_top_songs(self):
        scope = 'user-top-read'
        sp = spotipy.Spotify(auth_manager=SpotifyOAuth(
            scope=scope,
            client_id = self.user_values["client-id"],
            client_secret = self.user_values["client-secret"],
            redirect_uri='http://127.0.0.1:8123'))

        ranges = ['short_term', 'medium_term', 'long_term']
        self.top_songs = []
        for sp_range in ranges:
            results = sp.current_user_top_tracks(time_range=sp_range, limit=50)
            for i, item in enumerate(results['items']):
                self.top_songs.append([item['name'], item['artists'][0]['name'], item['uri']])

if __name__ == "__main__":
    spotify_app = Spotify(os.getcwd())
    uri = spotify_app.get_uri_spotify("the mars volta")
    spotify_app.play_spotify(uri)
