import json
import os
from google.cloud import vision 
import proto

# # Replace 'your-credentials.json' with the path to your API credentials JSON file.
# os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "your-credentials.json"

def get_image_captions(image_path):
    client = vision.ImageAnnotatorClient()

    # Load the image from the file system.
    with open(image_path, 'rb') as image_file:
        content = image_file.read()

    image = vision.Image(content=content)

    # Perform image annotation to get the captions.
    # response = client.annotate_image({
    #     'image': image,
    #     'features': [{'type': vision.Feature.Type.LABEL_DETECTION}],
    # })
    response = client.annotate_image({
        "image": {
            "content": image.content
        }
    })

    # captions = []
    # for caption in response.caption_annotations:
    #     captions.append(caption.description)

    return response

def main():
    image_folder = "ftp/camera1/20230927/images/"

    all_caps = []
    # Iterate through the images in the folder.
    for filename in os.listdir(image_folder):
        if filename.endswith(".jpg") or filename.endswith(".png"):
            if not 'A23092710533010.jpg' in filename: continue
            image_path = os.path.join(image_folder, filename)
            raw = get_image_captions(image_path)
            captions = proto.Message.to_json(raw)
            return captions
            print(f"Image: {filename}")
            if captions:
                for i, caption in enumerate(captions):
                    print(f"Caption {i + 1}: {caption}")
                return captions 
            else:
                print("No captions found for this image.")

if __name__ == "__main__":
    captions = main()