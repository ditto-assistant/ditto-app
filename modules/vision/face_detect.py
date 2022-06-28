'''
Vision module for face detection using opencv.

sources:
https://github.com/shantnu/Webcam-Face-Detect (deprecated)
'''

import cv2
import sys
import os 
from threading import Timer

class Face:

    def __init__(self):
        self.cascPath = "haarcascade_frontalface_default.xml"
        self.faceCascade = cv2.CascadeClassifier( os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml") )
        self.video_capture = cv2.VideoCapture(0)
        self.face_timer_mode = False
        self.face_cnt = 0
        self.face_cnt_timer = 0

    def start_capture(self):
        self.face_cnt = 0
        self.face_timer_mode = True
        self.face_timeout_handler(2)
        while True:
            print(self.face_cnt)
            # Capture frame-by-frame
            ret, frame = self.video_capture.read()
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.faceCascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
                flags=cv2.CASCADE_SCALE_IMAGE
            )

            # Draw a rectangle around the faces
            for (x, y, w, h) in faces:
                cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                self.face_cnt += 1
                self.face_cnt_timer = 0
                if self.face_cnt == 40:
                    self.attention_cnt += 1
                    return True

            
            # Display the resulting frame
            cv2.imshow('Video', frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    def end_capture(self):
        # When everything is done, release the capture
        self.video_capture.release()
        cv2.destroyAllWindows()

    def face_timeout_handler(self, timeout):
        self.face_timer = Timer(timeout, self.face_timeout_handler, [timeout])
        self.face_timer.start()
        if self.face_timer_mode: 
            self.face_cnt_timer += 1
        if self.face_cnt_timer == timeout:
            self.face_cnt_timer = 0
            self.face_cnt = 0

if __name__ == "__main__":
    face_detect = Face()
    activate = face_detect.start_capture()