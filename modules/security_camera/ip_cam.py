import cv2
import time
from datetime import datetime
import os

# Load the Haar cascade XML file for face detection
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

rtsp_link = "rtsp://192.168.0.208/1"

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

if not os.path.exists('captures'):
    os.mkdir('captures/')

# Read and display frames from the video stream
while True:
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
                # Generate the file name using timestamp
                stamp = str(datetime.utcfromtimestamp(time.time())).replace(
                    ' ', '').replace(':', '-').replace('.', '-')
                name = 'captures/'+f'{stamp}.jpg'

                # Save the image with the generated file name
                cv2.imwrite(name, frame)
                print("Image saved:", name)

            # Reset the counter and start time for the next 2-second interval
            face_counter = 0
            start_time = time.time()

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
