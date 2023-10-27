import cv2
import time
from PIL import Image
from threading import Thread
from caption_image import DittoImageCaption

# Function to generate and display captions
def generate_caption():
    caption_generator = DittoImageCaption()
    cap = cv2.VideoCapture(0) 

    # Create a window for displaying the camera feed
    cv2.namedWindow('Camera Feed', cv2.WINDOW_NORMAL)

    current_time = time.time()
    caption_update_seconds = 3

    caption = "Loading..."

    while True:


        ret, frame = cap.read()
        if ret:
            image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            
            # if 5 seconds have passed, generate a new caption
            if time.time() - current_time > caption_update_seconds:
                current_time = time.time()

                # get caption from another thread to not interrupt the camera feed
                thread = Thread(target=caption_generator.get_caption, args=(None,image))
                thread.start()
                
                caption = caption_generator.generated_caption

            # Render the caption on the frame
            cv2.putText(frame, caption, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

            # Display the frame with the caption
            cv2.imshow('Camera Feed', frame)

        # Check for a key press to cancel the loop
        key = cv2.waitKey(1)
        if key == 27:  # Check for the 'Esc' key (27 is the ASCII code for 'Esc')
            break

    cap.release()
    cv2.destroyAllWindows()

generate_caption()