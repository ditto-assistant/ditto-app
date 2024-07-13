# Ditto Assistant (Ditto Unit):
- Welcome to Ditto Assistant! This is the main logic for a Ditto Unit, which can exist on a Mac, Windows, Rasperry Pi, or anything that runs Python.
The full setup can support multiple Ditto Units around the house on the same network (LAN). The goal is to provide an open source LLM Smart Home experience to work just like your Google Home or Alexa, with much more capabilities.
- We have a seperate repository, which is a required server, that houses custom ML models for intent and named-entity recognition to handle smart home commands and much more. This server is [nlp_server](https://github.com/ditto-assistant/nlp_server) and it also contains the main logic for the LLM agent, a complex agent pipeline that supports Google Search, Compiling Code, and Long Term Memory with [Langchain](https://www.langchain.com/) integration.
- Optionally, run our [vision_server](https://github.com/ditto-assistant/vision_server) to give Ditto some eyes! This supports image captioning- see vision server's readme for Image RAG visual and Demo.
## Mac / Windows / Linux (Rpi too)
- Comes with a [chat interface](https://github.com/ditto-assistant/ditto-app) for interacting with Ditto.
- Supports Wake word "Hey Ditto" activation and spoken prompting.
- Generated Knowledge Graphs (Neo4j) visualization from our [nlp_server](https://github.com/ditto-assistant/nlp_server) and [Home Assistant](https://github.com/home-assistant) integration.
- Home Assistant configuration can be found in `.env.example` when creating `.env`.
- Works like any other smart home assistant! Has access to your Google or Alexa smart home setup via [Home Assistant](https://github.com/home-assistant).
- Requires a mic and speaker for wake word and playing spotify music.
## Requirements
This is just the logic for a Ditto Unit. Running this requires the [Ditto Stack](https://github.com/ditto-assistant/ditto-stack) Docker container to be running.
## Setup Instructions
1. Tested on Python versions 3.7-3.10. Install whichever you prefer!
2. Rename .env.example to .env and fill out API credentials you want to use (see Environment Setup Instructions below).

Use your favorite package manager to [Install just](https://github.com/casey/just#packages) then run install:

```bash
just install
```

After turning on the [nlp_server](https://github.com/ditto-assistant/nlp_server) and the optional [vision_server](https://github.com/ditto-assistant/vision_server), You may run assistant with:

```bash
just run
```

If you don't want `just`, continue following #2-5:

3. After installing, create a python environment with the following commands (do this outside of `assistant/`):

```bash
python -m venv ditto
```

4. To Activate the environment, run the following:

```bash
source ditto/bin/activate
```

5. Navigate into `assistant` and run:

```bash
pip install -r requirements.txt
```

## Running
1. `just run` if using just, otherwise:
2. Simply run `python main.py` to boot the assistant server, ready for [ditto_app](https://github.com/ditto-assistant/ditto-app) front-end.

## Environment Setup Instructions

1. Google Cloud Setup:
   1. Create Google Cloud Console account and create a project with any name to get access to the console.
   2. Enable Google Speech-to-Text and Text-to-Speech API services:
      1. https://console.cloud.google.com/apis/api/speech.googleapis.com
      2. https://console.cloud.google.com/apis/api/texttospeech.googleapis.com
   3. Credentials key download:
      1. Navigate to IAM & Admin in the Google cloud navigator and click "Service Accounts".
      2. Click create service account at the top of the page if there is not one for your project already.
      3. After creating service account, go back to the Service Accounts page and select your service account hyperlink in the "Email" column.
      4. Click "Keys" at the top of the page.
      5. Click "Add Key" and select json.
      6. Save the .json key to `assistant/resources` folder.
   4. Set the environment variable:
      1. Set `GOOGLE_APPLICATION_CREDENTIALS` in `.env` to the absolute path of the .json credential key.
2. OpenAI API Setup:
   1. Create an account at openai.com/api and go to account settings to find an API key string. Copy this string and paste the key into `.env` at `OPENAI_API_KEY=insert_key_here`.
3. Spotify API Setup:
   1. Create a Spotify [Developer account](https://developer.spotify.com/documentation/web-api).
   2. Create a new Spotify project to generate API keys.
   3. Fill out `SPOTIPY_CLIENT_ID`, `SPOTIPY_CLIENT_SECRET`, and `SPOTIPY_REDIRECT_URI` in `.env` from your Spotify project settings.
4. Teensy Setup (optional, for FastLED light strips):
   1. Building to Teensy:
      1. Install platformio and anything else needed to program your Teensy. Simply build and upload the platformio project located in `assistant/modules/teensy41` .
   2. Assistant Setup for Teensy.
         1. Find the unique Teensyduino_USB_Serial path, for example: `/dev/serial/by-id/usb-Teensyduino_USB_Serial` and save this to `.env` as the `teensy_path` key variable, i.e. `teensy_path=/dev/serial/by-id/usb-Teensyduino_USB_Serial`.
         2. Windows:
            1. Find the `COM` port in device manager after flashing your Teensy and set the `.env` key `teensy_path` to your COM number, i.e. `teensy_path=COM5`.

