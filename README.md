# Run with Docker (WIP):
1. Rename .env.example to .env and fill out API credentials you want to use (see Extra Notes below for .env setup instructions). 
2. Build the Docker image: 

```bash
docker build -t ditto .
```

3. Run the image on a new container:

```bash
docker run --env-file .env --rm -p 42032:42032 ditto
```

# Running locally without Docker:

1. Tested on Python versions 3.7-3.10. Install whichever you prefer!
2. Rename .env.example to .env and fill out API credentials you want to use (see Extra Notes below for .env setup instructions).

Use your favorite package manager to [Install just](https://github.com/casey/just#packages) then run install:

```bash
just install
```

After turning on the [nlp_server](https://github.com/omarzanji/nlp_server), You may run assistant with:

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
6. Start Ditto by running:

```bash
python main.py
```

## Extra Setup Notes

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

## Running:

- Simply run `python main.py` to boot the assistant along with a Flask server for communicating with the [Ditto App](https://github.com/omarzanji/ditto-app) front-end client.

## Common issues

### For Mac

[How to resolve fatal pyaudio error](https://www.codewithharry.com/blogpost/pyaudio-not-found-error/)
[portaudio help](https://stackoverflow.com/a/48815345)

```
pip install tensorflow-macos matplotlib pandas
```
