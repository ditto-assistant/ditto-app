import json


class SpotifyHandler():

    def __init__(self):
        pass

    def handle_response(self, command, nlp, prompt):
        ner_response = json.loads(nlp.prompt_ner_play(prompt))
        song = ner_response['song']
        artist = ner_response['artist']
        playlist = ner_response['playlist']
        if playlist == '':
            if song == '':
                p = command.play_music(artist.strip())
                if p==1:
                    reply = '[Playing %s on Spotify]' % artist.title()
                if (p==-1):
                    reply = '[Could not find %s on Spotify]' % artist.title()
            elif artist == '':
                p = command.play_music(song.strip())
                if p==1:
                    reply = '[Playing %s on Spotify]' % song.title()
                if (p==-1):
                    reply = '[Could not find %s on Spotify]' % song.title()
            else:
                p = command.play_music(artist.strip(), song.strip())
                if p==1:
                    reply = '[Playing %s by %s on Spotify]' % (song.title(), artist.title())
                if (p==-1):
                    reply = '[Could not find %s by %s on Spotify]' % (song.title(), artist.title())
        else:
            try:
                p = command.play_user_playlist(playlist.lower().strip())
            except:
                p==-1
            if p==1:
                reply = '[Playing %s Playlist on Spotify]' % playlist.title()
            if p==-1:
                reply = '[Could not find %s Playlist on Spotify]' % playlist.title()
        
        print(reply+'\n')

        return reply
