# Package Setup:

1. Tested on Python versions 3.7-3.10. Install whichever you prefer!

Use your favorite package manager to [Install just](https://github.com/casey/just#packages) then run install:

```bash
just install
```

After turning on the [nlp_server](https://github.com/omarzanji/nlp_server), You may run assistant with:

```bash
just run
```

If you don't want `just`, continue following #2-4:

2. After installing, create a python environment with the following commands (do this outside of `assistant/`):

```bash
python -m venv ditto
```

3. To Activate the environment, run the following:

```bash
source ditto/bin/activate
```

4. Navigate into `assistant` and run:

```bash
pip install -r requirements.txt
```

## Full Setup (Online Mode)

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
      1. Set `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path of the .json credential key.
2. OpenAI API Setup (GPT-3):
   1. Create an account at openai.com/api and go to account settings to find an API key string. Copy this string and create an OS environment variable with the following name and value: `OPENAI_API_KEY=insert_key_here`
3. Spotify API Setup (optional):
   1. Instructions coming soon...
4. Teensy Setup (optional, for FastLED light strips):
   1. Building to Teensy:
      1. Install platformio and anything else needed to program your Teensy. Simply build and upload the platformio project located in `assistant/modules/teensy41` .
   2. Assistant Setup for Teensy.
      1. Rpi Instructions:
         1. Run main.py to generate template config.json in `assistant/resources`.
         2. Find the unique Teensyduino_USB_Serial path, for example: `/dev/serial/by-id/usb-Teensyduino_USB_Serial` and save this to `config.json` as the "teensy_path" key variable.
      2. Windows Instructions:
         1. Run main.py to generate template config.json in `assistant/resources`.
         2. Find the COM port in device manager after plugging in / flashing your Teensy and set the `resources/config.json` key "teensy_path" to "COM" or "COM1" depending on your machine.

## Running:

- Simply run `python main.py` to boot the assistant along with a Flask server for communicating with the [Ditto App](https://github.com/omarzanji/ditto-app) front-end client.

## Common issues

### For Mac

[How to resolve fatal pyaudio error](https://www.codewithharry.com/blogpost/pyaudio-not-found-error/)
[portaudio help](https://stackoverflow.com/a/48815345)

```
pip install tensorflow-macos matplotlib pandas
```
