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
from config import AppConfig


class Command:
    def __init__(self, path, offline_mode=False):
        self.offline_mode = offline_mode
        self.config = AppConfig()
        self.path = path
        self.volume = self.config.volume
        self.light_handler = LightHandler()
        self.spotify_handler = SpotifyHandler(
            path,
            offline_mode,
        )
        self.timer_handler = TimerHandler(
            path,
        )
        self.weather_handler = WeatherHandler()
        self.wolfram_handler = WolframHandler(path)
        self.conversation_handler = ConversationHandler(offline_mode)
        self.soundscapes_handler = SoundScapesHandler(
            path,
        )
        self.iot_remote_handler = IOTRemoteHandler()
        self.volume_handler = VolumeHandler()


if __name__ == "__main__":
    import os

    command = Command(os.getcwd())
