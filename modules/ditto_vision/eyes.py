import cv2
import time
from threading import Thread
from PIL import Image
import base64
from io import BytesIO


class Eyes:
    def __init__(self):
        self.latest_frame = None
        self.refresh_rate = 3  # seconds
        self.running = False

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

            time.sleep(self.refresh_rate)

        cap.release()

    def stop(self):
        self.running = False

    def start(self):
        self.running = True
        thread = Thread(target=self.run)
        thread.start()
