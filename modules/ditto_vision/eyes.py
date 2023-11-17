import cv2
import time
from threading import Thread
from PIL import Image
import base64
from io import BytesIO
import requests
import json

import logging
log = logging.getLogger("eyes")
log.setLevel(logging.INFO)

class Eyes:
    def __init__(self, vision_base_url: str, eyes_on: bool = True):
        self.vision_base_url = vision_base_url
        self.eyes_on = eyes_on
        self.latest_frame = None
        self.face_name = None # str when a face is detected in the frame otherwise resets to None
        self.person_in_frame = 'no' # yes when a person is detected in the frame otherwise resets to no
        self.refresh_rate = 3  # seconds
        self.running = False

    def toggle(self):
        # invert eyes_on
        self.eyes_on = not self.eyes_on
        if self.running:
            self.stop()
        else:
            self.start()

    def check_frame_for_face(self):
        '''uses vison_base_url to check if a face is in the frame'''
        if self.latest_frame is not None:
            try:
                response = requests.post(
                    url=f'{self.vision_base_url}/scan_face',
                    files={'image': self.latest_frame},
                    timeout=3 # seconds
                )
                response = json.loads(str(response.content.decode()))
                self.face_name = response['face_name']
                self.person_in_frame = response['person_detected']
            except BaseException as e:
                # log.error(e)
                # log.info(f'response: {response}')
                self.face_name = None
                self.person_in_frame = 'no'
        else:
            self.face_name = None
            self.person_in_frame = 'no'

    def run(self):
        cap = cv2.VideoCapture(0)

        while self.running:
            ret, frame = cap.read()

            if ret:
                image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                buffered = BytesIO()
                image.save(buffered, format="JPEG")
                base64_str = base64.b64encode(buffered.getvalue())
                self.latest_frame = base64_str
                try:
                    self.check_frame_for_face()
                except BaseException as e:
                    log.error(e)

            time.sleep(self.refresh_rate)

        cap.release()

    def stop(self):
        self.running = False

    def start(self):
        if self.eyes_on == False:
            return -1
        self.running = True
        thread = Thread(target=self.run)
        thread.start()
        return 1