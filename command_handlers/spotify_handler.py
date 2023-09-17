import json
import requests

from modules.spotify.spotify import Spotify


class SpotifyHandler:
    def __init__(self, path, config, offline_mode, volume=None):
        self.config = config
        self.path = path
        self.offline_mode = offline_mode
        self.volume = volume
        self.load_spotify_player(volume)
        self.nlp_ip = config["nlp-server"]

    def load_spotify_player(self, volume):
        if not self.offline_mode:
            try:
                self.player = Spotify(self.path + "/modules/spotify", volume)
            except BaseException as e:
                print(e)
                print("spotify error")
                self.player = []
        else:
            self.player = []

    def prompt_ner_play(self, prompt):
        base_url = f"http://{self.nlp_ip}:32032/ner/play"
        response = requests.post(base_url, params={"prompt": prompt})
        return response.content.decode()

    def play_music(self, artist, song=None):
        play = -1
        uri = self.player.get_uri_spotify(artist, song)

        if not uri == None:
            play = self.player.play_spotify(uri)
        else:
            return -1

        if play:
            return 1
        else:
            return -1

    def play_user_playlist(self, name):
        play = -1
        uri = ""
        for x in self.player.user_playlists:
            if name.lower() in x[0].lower():
                uri = x[1]
        if uri == "":
            uri = self.player.get_uri_spotify(playlist=name)
            if uri == -1:
                return -1
        play = self.player.play_spotify(uri)
        if play:
            return 1
        else:
            return -1

    def handle_response(self, prompt):
        ner_response = json.loads(self.prompt_ner_play(prompt))
        song = ner_response["song"]
        artist = ner_response["artist"]
        playlist = ner_response["playlist"]
        if playlist == "":
            if song == "":
                p = self.play_music(artist.strip())
                if p == 1:
                    reply = "[Playing %s on Spotify]" % artist.title()
                if p == -1:
                    reply = "[Could not find %s on Spotify]" % artist.title()
            elif artist == "":
                p = self.play_music(song.strip())
                if p == 1:
                    reply = "[Playing %s on Spotify]" % song.title()
                if p == -1:
                    reply = "[Could not find %s on Spotify]" % song.title()
            else:
                p = self.play_music(artist.strip(), song.strip())
                if p == 1:
                    reply = "[Playing %s by %s on Spotify]" % (
                        song.title(),
                        artist.title(),
                    )
                if p == -1:
                    reply = "[Could not find %s by %s on Spotify]" % (
                        song.title(),
                        artist.title(),
                    )
        else:
            try:
                p = self.play_user_playlist(playlist.lower().strip())
            except:
                p == -1
            if p == 1:
                reply = "[Playing %s Playlist on Spotify]" % playlist.title()
            if p == -1:
                reply = "[Could not find %s Playlist on Spotify]" % playlist.title()

        print(reply + "\n")

        return reply
