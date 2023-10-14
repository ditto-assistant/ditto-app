import os
import logging
from dotenv import load_dotenv

# Configure the logger
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


class SingletonMeta(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(SingletonMeta, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


class AppConfig(metaclass=SingletonMeta):
    def __init__(self):
        load_dotenv()  # Load environment variables from .env file
        # Define attributes for each configuration option
        self.nlp_server_ip = os.getenv("nlp_server_ip")
        self.nlp_server_port = int(os.getenv("nlp_server_port", 32032))
        self.nlp_server_protocol = os.getenv("nlp_server_protocol", "http")
        self.volume = int(os.getenv("volume", 70))
        self.microphone = os.getenv("microphone", "default")
        self.teensy_path = os.getenv("teensy_path", "")
        self.user_id = os.getenv("user_id", "")
        self.ha_entities = os.getenv("ha_entities", "").split(",")
        self.google_application_credentials = os.getenv(
            "GOOGLE_APPLICATION_CREDENTIALS", ""
        )
        self.pygame_hide_support_prompt = int(
            os.getenv("PYGAME_HIDE_SUPPORT_PROMPT", 1)
        )
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.spotipy_client_id = os.getenv("SPOTIPY_CLIENT_ID", "")
        self.spotipy_client_secret = os.getenv("SPOTIPY_CLIENT_SECRET", "")
        self.spotipy_redirect_uri = os.getenv("SPOTIPY_REDIRECT_URI", "")
        self.home_assistant_api_key = os.getenv("HOME_ASSISTANT_API_KEY", "")
        self.home_assistant_api_url = os.getenv("HOME_ASSISTANT_API_URL", "")
        self.fitbit_client_secret = os.getenv("FITBIT_CLIENT_SECRET", "")
        self.fitbit_redirect_url = os.getenv("FITBIT_REDIRECT_URL", "")

    def base_url(self):
        return (
            f"{self.nlp_server_protocol}://{self.nlp_server_ip}:{self.nlp_server_port}"
        )
