FROM python:3.11.4-slim-bullseye

RUN apt update && \
    apt upgrade -y && \
    apt install -y --no-install-recommends portaudio19-dev build-essential gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . ./

EXPOSE 42032

# tried to enable coreaudio to make the mac container work
# ENV SDL_AUDIODRIVER coreaudio

CMD python main.py