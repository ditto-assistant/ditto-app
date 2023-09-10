"""
Command handlers initiated and ready to process prompts into commands."""

# response handlers for main.py to use
from command_handlers.light_handler import LightHandler
from command_handlers.spotify_handler import SpotifyHandler
from command_handlers.timer_handler import TimerHandler
from command_handlers.weather_handler import WeatherHandler
from command_handlers.wolfram_handler import WolframHandler
from command_handlers.conversation_handler import ConversationHandler
from command_handlers.soundscapes_handler import SoundScapesHandler
from command_handlers.iot_remote_handler import IOTRemoteHandler
from command_handlers.volume_handler import VolumeHandler


class Command:

    def __init__(self, path, offline_mode=False, config=None, volume=None):
        self.offline_mode = offline_mode
        self.config = config
        self.path = path
        self.volume = volume
        self.light_handler = LightHandler(config)
        self.spotify_handler = SpotifyHandler(path, config, offline_mode, volume)
        self.timer_handler = TimerHandler(path, config)
        self.weather_handler = WeatherHandler()
        self.wolfram_handler = WolframHandler(path)
        self.conversation_handler = ConversationHandler(config, offline_mode)
        self.soundscapes_handler = SoundScapesHandler(path, volume)
        self.iot_remote_handler = IOTRemoteHandler()
        self.volume_handler = VolumeHandler(config)
        


if __name__ == "__main__":
    import os
    command = Command(os.getcwd())
