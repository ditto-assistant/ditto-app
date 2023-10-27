# import requests
import base64
import json

import google.auth.transport.requests as requests
from google.oauth2 import service_account
# creds, project = google.auth.default( scopes=['googleapis.com/auth/cloud-platform'])


import os

from dotenv import load_dotenv
load_dotenv()

GOOGLE_APPLICATION_CREDENTIALS = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
DITTO_PROJECT_ID = os.environ.get('DITTO_PROJECT_ID')

creds = service_account.Credentials.from_service_account_file(
    GOOGLE_APPLICATION_CREDENTIALS, 
    scopes=['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/cloud-vision'])

auth_req = requests.Request()
creds.refresh(auth_req)

def caption_image(image_path, project_id, response_count, language_code):
    # Read image file as bytes
    with open(image_path, 'rb') as f:
        image_bytes = f.read()

    # Encode image bytes as base64
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')

    # Create JSON request body
    request_body = {
        "instances": [
            {
                "image": {
                    "bytesBase64Encoded": image_base64
                }
            }
        ],
        "parameters": {
            "sampleCount": response_count,
            "language": language_code
        }
    }

    # Send POST request to Vertex AI endpoint
    endpoint = f"https://us-central1-aiplatform.googleapis.com/v1/projects/{project_id}/locations/us-central1/publishers/google/models/imagetext:predict"
    # response = requests.post(endpoint, json=request_body, auth=creds.token)
    response = requests.requests.api.post(endpoint, json=request_body, headers={'Authorization': 'Bearer ' + creds.token})

    # # Parse response JSON and return captions
    response_json = json.loads(response.text)
    print(response_json)
    exit()


    return caption

path = 'C:/Users/ozanj/Pictures/Screenshots/'
image = 'Screenshot_20221110_022553.png'
full_path = path + image

captions = caption_image(full_path, DITTO_PROJECT_ID, 1, 'en')