FROM python:3.11.4-slim-bullseye

RUN apt update && \
    apt upgrade -y && \
    apt install -y --no-install-recommends portaudio19-dev build-essential gcc git && \
    rm -rf /var/lib/apt/lists/*

# COPY requirements.txt ./

RUN git clone https://github.com/omarzanji/assistant.git --recursive https://github.com/omarzanji/ditto_activation.git

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# COPY . ./

EXPOSE 42032

# tried to enable coreaudio to make the mac container work
# ENV SDL_AUDIODRIVER coreaudio

CMD cd assistant && python main.py