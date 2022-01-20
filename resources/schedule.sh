#!/bin/bash

echo "playing silence to keep speaker on! ..." | tee /var/log/ditto.log
mpg321 /home/pi/assistant/resources/silence.mp3
