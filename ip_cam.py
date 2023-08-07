import cv2
import time
from datetime import datetime
import os
import json
import numpy as np
from tensorflow import keras
from keras import backend as K

from modules.security_camera.face_validator_net.facevalnet import FaceValNet
from modules.home_assistant.home_assistant import HomeAssistant

CONFIDENCE = 90

home = HomeAssistant()

face_val_net = FaceValNet(
    'production', path='modules/security_camera/face_validator_net/')
model = face_val_net.model

# Load the Haar cascade XML file for face detection
face_cascade = cv2.CascadeClassifier(
    "modules/security_camera/haarcascade_frontalface_default.xml")

rtsp_link = json.load(
    open('modules/security_camera/config.json', 'r'))['rtsp_cam1']

# Create a VideoCapture object
cap = cv2.VideoCapture(rtsp_link)


def re_init_cap(cap):
    cap.release()
    cv2.destroyAllWindows()
    time.sleep(0.2)
    cap = cv2.VideoCapture(rtsp_link)
    return cap


# Check if the VideoCapture object was successfully opened
if not cap.isOpened():
    print("Failed to open the RTSP link.")
    exit()

# Parameters for face detection counting
face_counter = 0
start_time = time.time()

if not os.path.exists('modules/security_camera/captures'):
    os.mkdir('modules/security_camera/captures/')

print('\n[Watching Front Door.]\n')

# Read and display frames from the video stream
while True:
    time.sleep(0.1)
    try:
        ret, frame = cap.read()

        if not ret:
            print("Failed to read the frame.")
            cap = re_init_cap(cap)

        # Convert the frame to grayscale for face detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Detect faces in the grayscale frame
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))

        # Draw bounding boxes around the detected faces
        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

            # Crop the face region from the frame
            face_crop = gray[y:y+h, x:x+w]

            # Resize the face crop to 60x60
            face_crop_resized = cv2.resize(face_crop, (60, 60))

            # Expand dimensions to make it 60x60x1
            face_crop_resized = np.expand_dims(face_crop_resized, axis=-1)

            # Generate the file name using timestamp
            stamp = str(datetime.utcfromtimestamp(time.time())).replace(
                ' ', '').replace(':', '-').replace('.', '-')
            image_name = 'modules/security_camera/captures/' + f'{stamp}.jpg'
            face_name = 'modules/security_camera/captures/' + \
                f'{stamp}_face.jpg'

        # Display the frame with face bounding boxes
        # cv2.imshow("RTSP Stream with Face Detection", frame)

        # Increment face_counter if faces are detected
        if len(faces) > 0:
            face_counter += 1

        # Check if 2 seconds have passed
        elapsed_time = time.time() - start_time
        if elapsed_time >= 2:
            # Check if at least 10 faces were detected
            if face_counter >= 10:

                model_confidence = np.array(model(
                    np.expand_dims(face_crop_resized, 0)))[0][0] * 100
                K.clear_session()

                if model_confidence >= CONFIDENCE:
                    home.send_push_camera()

                    print('\nFaceValNet Model Confidence:', model_confidence)
                    # Save the entire frame
                    cv2.imwrite(image_name, frame)
                    print("Image saved:", image_name)

                    # Save the cropped face (grayscale)
                    cv2.imwrite(face_name, face_crop_resized)
                    print("Cropped face saved:", face_name)

                # Reset the counter and start time for the next 2-second interval
                face_counter = 0
                start_time = time.time()
            else:
                continue

        # Check for the 'q' key to exit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    except BaseException as e:
        # Release the VideoCapture object and close any open windows
        cap = re_init_cap(cap)
        print(e)

# Release the VideoCapture object and close any open windows
cap.release()
cv2.destroyAllWindows()
