"""
Spotify application build around the Spotify Web API.

refs:
1) https://developer.spotify.com/documentation/general/guides/authorization/
2) https://github.com/plamere/spotipy
"""

from lib2to3.pytree import Base
import os
import json
import random
import webbrowser

import spotipy
from spotipy.oauth2 import SpotifyOAuth, SpotifyClientCredentials
import spotipy.util as util


class Spotify():

    def __init__(self, path, volume):

        self.path = path
        self.volume = volume/100
        self.load_configs(path)
        self.status = 'off'
        if 'SPOTIPY_CLIENT_ID' in os.environ.keys():  # only run if configured correctly
            sp = spotipy.Spotify(auth_manager=SpotifyOAuth(open_browser=True))
            if sp.current_playback() is not None: sp.volume(volume)
            self.grab_active_id(sp)
            # pre-save user data
            self.get_user_details()
            self.status = 'on'
        else:
            print("\n[Configure client ID and Secret ID in spotify.json ...]")

    def load_configs(self, path):
        # first time set up (automated as much as possible)
        l = []
        for x in os.listdir(path):
            l.append(x)

        if not 'resources' in l:
            os.system('mkdir resources')

        l = []
        for x in os.listdir(path + '/resources'):
            l.append(x)
        if 'spotify.json' not in l:
            print('no spotify json found...')
            s = json.dumps(
                {"device-name": "", "device-id": "", "username": ""})
            with open(path + '/resources/spotify.json', 'w') as f:
                f.write(s)
            print('created spotify.json in resources/')
            print('please fill in client app IDs')

        with open(path + '/resources/spotify.json') as f:
            s = ""
            for x in f.readlines():
                s += x
        self.user_values = json.loads(s)

    def remote(self, command, *args):
        scope = "user-read-playback-state,user-modify-playback-state"
        username = self.user_values['username']
        self.auth = spotipy.SpotifyOAuth(
            scope=scope,
            redirect_uri=os.environ['SPOTIPY_REDIRECT_URI'],
            client_id=os.environ['SPOTIPY_CLIENT_ID'],
            client_secret=os.environ['SPOTIPY_CLIENT_SECRET'],
            open_browser=True
        )
        sp = spotipy.Spotify(auth_manager=self.auth)
        if sp.current_playback() is None:
            return
        self.token = util.prompt_for_user_token(
            oauth_manager=self.auth,
            username=username, scope=scope,
            client_id=os.environ['SPOTIPY_CLIENT_ID'],
            client_secret=os.environ['SPOTIPY_CLIENT_SECRET'],
            redirect_uri=os.environ['SPOTIPY_REDIRECT_URI']
        )
        try:
            if command == "resume":
                sp.start_playback(self.user_values['device-id'])
                print('\n[resume]')
            elif command == "pause":
                sp.pause_playback(self.user_values['device-id'])
                print('\n[pause]')
            elif command == "next":
                print('\n[next]')
                sp.next_track(self.user_values['device-id'])
            elif command == "previous":
                print('\n[previous]')
                sp.previous_track(self.user_values['device-id'])
            elif command == 'volume':
                volume = args[0]
                sp.volume(volume)
            else:
                pass
        except BaseException as e:
            print(e)

    def play_spotify(self, uri):
        try:
            if 'playlist' in uri:
                context_mode = 'playlist'
            else:
                context_mode = 'song'
            scope = "user-read-playback-state,user-modify-playback-state"
            username = self.user_values['username']

            self.auth = spotipy.SpotifyOAuth(
                scope=scope,
                redirect_uri=os.environ['SPOTIPY_REDIRECT_URI'],
                client_id=os.environ['SPOTIPY_CLIENT_ID'],
                client_secret=os.environ['SPOTIPY_CLIENT_SECRET'],
                open_browser=True
            )
            sp = spotipy.Spotify(auth_manager=self.auth)
            self.token = util.prompt_for_user_token(
                oauth_manager=self.auth,
                username=username, scope=scope,
                client_id=os.environ['SPOTIPY_CLIENT_ID'],
                client_secret=os.environ['SPOTIPY_CLIENT_SECRET'],
                redirect_uri=os.environ['SPOTIPY_REDIRECT_URI']
            )
            # self.grab_active_id(sp) # update device-id with latest active player
            if context_mode == 'playlist':
                print('playlist mode')
                for x in self.user_playlists:
                    if uri in x:  # find playist
                        offset_max = x[2]  # grab tack count
                        shuffle_val = random.randint(0, offset_max)
                    else:
                        shuffle_val = 10
                sp.start_playback(context_uri=uri, offset={
                                  "position": shuffle_val}, device_id=self.user_values["device-id"])
            if context_mode == 'song':
                sp.start_playback(
                    uris=[uri], device_id=self.user_values["device-id"])
            return 1
        except BaseException as e:
            print("invalid uri: %s" % uri)
            print(e)
            return -1

    def get_uri_spotify(self, artist_song=None, song=None, playlist=None):

        if artist_song and self.top_songs:
            for track in self.top_songs:
                track_song = track[0].lower()
                track_artist = track[1].lower()
                track_uri = track[2]
                if song == None and (artist_song.lower() in track_song or artist_song.lower() in track_artist):
                    print('found %s in top songs\n' % artist_song.title())
                    return track_uri
                if not song == None and artist_song.lower() in track_artist:
                    print('found %s by %s in top songs\n' %
                          (song.title(), artist_song.title()))
                    return track_uri

        sp = spotipy.Spotify(
            auth_manager=SpotifyClientCredentials(
                client_id=os.environ['SPOTIPY_CLIENT_ID'],
                client_secret=os.environ['SPOTIPY_CLIENT_SECRET'],
            )
        )
        try:
            if artist_song:
                # change limit for more results
                results = sp.search(q=artist_song, limit=30,
                                    type='artist,track')
                tracks = results['tracks']['items']
                ret_track = ''
                for idx, track in enumerate(tracks):
                    if artist_song.lower() in track['name'].lower():
                        ret_track = track['external_urls']['spotify']
                if ret_track:
                    return ret_track
                else:
                    random.shuffle(tracks)
                    ret_track = tracks[0]['external_urls']['spotify']
                    return ret_track
            elif song:
                results = sp.search(q=song, type='track')
                tracks = results['tracks']['items']
                for idx, track in enumerate(tracks):
                    if song.lower() in track['name'].lower():
                        ret_track = track['external_urls']['spotify']
                if ret_track:
                    return ret_track
                else:
                    random.shuffle(tracks)
                    ret_track = tracks[0]['external_urls']['spotify']
                    return ret_track
            elif playlist:
                results = sp.search(q=playlist, type='playlist')
                tracks = results['playlists']['items']
                for idx, track in enumerate(tracks):
                    if playlist.lower() in track['name'].lower():
                        ret_track = track['uri']
                if ret_track:
                    return ret_track
                else:
                    random.shuffle(tracks)
                    ret_track = tracks[0]['uri']
                    return ret_track
            else:
                return -1  # nothning found or all enteties empty from NER

        except BaseException as e:
            print('invalid search')
            print(e)
            return -1

    def get_user_details(self):
        scope = 'user-top-read, playlist-read-private, user-read-playback-state, user-modify-playback-state'
        username = self.user_values['username']

        self.auth = spotipy.SpotifyOAuth(
            scope=scope,
            open_browser=True,
            redirect_uri=os.environ['SPOTIPY_REDIRECT_URI'],
            client_id=os.environ['SPOTIPY_CLIENT_ID'],
            client_secret=os.environ['SPOTIPY_CLIENT_SECRET'],
        )
        sp = spotipy.Spotify(auth_manager=self.auth)
        self.token = util.prompt_for_user_token(
            oauth_manager=self.auth,
            username=username, scope=scope,
            client_id=os.environ['SPOTIPY_CLIENT_ID'],
            client_secret=os.environ['SPOTIPY_CLIENT_SECRET'],
            redirect_uri=os.environ['SPOTIPY_REDIRECT_URI']
        )

        # grab top songs
        ranges = ['short_term', 'medium_term', 'long_term']
        self.top_songs = []
        for sp_range in ranges:
            results = sp.current_user_top_tracks(time_range=sp_range, limit=75)
            for i, item in enumerate(results['items']):
                self.top_songs.append(
                    [item['name'], item['artists'][0]['name'], item['uri']])  # save ext url

        # grab top playlists
        user_id = sp.me()['id']
        self.user_playlists = []
        playlists = sp.current_user_playlists(limit=50)
        for playlist in playlists['items']:
            self.user_playlists.append(
                [playlist['name'], playlist['uri'], playlist['tracks']['total']])  # save ext url

        # grab active or prev saved spotify player's device id
        self.grab_active_id(sp)

    def grab_active_id(self, sp):
        '''set active or prev saved spotify player's device id
        \nparam:
        sp: spotipy.Spotify() object
        '''
        device_name = self.user_values['device-name']
        device_id = self.user_values['device-id']
        # grab device-id

        try:
            self.devices = sp.devices()
        except BaseException as e:
            self.devices = {'devices': []}

        try:

            if not self.devices['devices'] == []:
                if not device_name:
                    # grab topmost id (last active)
                    device_id = self.devices['devices'][0]['id']
                else:
                    for device in self.devices['devices']:
                        name = device['name']
                        if device_name in name:
                            print(f'\n[Found Spotify device ID for {name}]')
                            if not device_id:
                                device_id = device['id']
                self.user_values['device-id'] = device_id
                with open(self.path+'/resources/spotify.json', 'w') as f:  # store to json
                    json.dump(self.user_values, f)
        except BaseException as e:
            print(e)
            pass


if __name__ == "__main__":
    spotify_app = Spotify(os.getcwd())

    # uri = spotify_app.get_uri_spotify("the mars volta")
    # spotify_app.play_spotify(uri)

    # spotify_app.next_song()

    # spotify_app.play_spotify('spotify:playlist:2PT7ZGFsCmFpRUBrzXFZGT')
