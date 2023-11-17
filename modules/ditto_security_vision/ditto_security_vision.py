import shutil
import os
import time
from PIL import Image
import base64
from io import BytesIO
import logging
import requests
import json
import sys

# holds strings of entities to check for in images
from entities import entities as ENTITIES

from home_assistant import HomeAssistant

log = logging.getLogger("ditto_security_vision")
log.setLevel(level=logging.INFO)
log.addHandler(logging.StreamHandler(sys.stdout))

from dotenv import load_dotenv
load_dotenv()

class DittoSecurityVision():
    
    def __init__(self, path='') -> None:
        self.path = path
        self.init_cameras()
        self.init_vision_server_endpoint()
        self.home_assistant = HomeAssistant()

    def init_cameras(self):
        if not os.path.exists(self.path+'ftp/'): os.mkdir(self.path+'ftp/')
        self.cameras = []
        for camera in os.listdir(self.path+'ftp/'):
            if 'camera' in camera:
                self.cameras.append(camera)
        if self.cameras == []:
            print('No cameras found')
            exit()

    def init_vision_server_endpoint(self):
        self.vision_server_ip = os.getenv("vision_server_ip", "localhost")
        self.vision_server_port = int(os.getenv("vision_server_port", 52032))
        self.vision_server_protocol = os.getenv("vision_server_protocol", "http")
        self.vision_server_url = f"{self.vision_server_protocol}://{self.vision_server_ip}:{self.vision_server_port}"    
    
    def qa_for_entities(self, image):

        def get_qa(prompt, image):
            try:
                url = f"{self.vision_server_url}/qa"
                files = {'image': image}
                params = {'prompt': prompt}
                raw_response = requests.post(url, files=files, params=params)
                response = json.loads(raw_response.content.decode())['response']
                return response
            except BaseException as e:
                log.error(e)
                return None

        entities = []
        for entity_prompt, entity_name in ENTITIES:
            qa_res = get_qa(prompt=entity_prompt, image=image)
            if 'yes' in str(qa_res).lower():
                entities.append(entity_name)
            else:
                continue
        return entities

    def check_ftp_for_entities(self, max_retries=10):
        log.info('Waiting for images...')
        retries=0
        while True and retries < max_retries:
            time.sleep(1)
            try:
                if not os.path.exists('ftp/marked_for_deletion/'): os.mkdir('ftp/marked_for_deletion/')
                if not os.path.exists('ftp/entities/'): os.mkdir('ftp/entities/')
                for entity in ENTITIES:
                    if not os.path.exists('ftp/entities/'+entity[1]+'/'): os.mkdir('ftp/entities/'+entity[1]+'/')
                for camera in self.cameras:
                    for camera_day in os.listdir(self.path+'ftp/'+camera+'/'):
                        # get current YMD 
                        camera_day_path = self.path+'ftp/'+camera+'/'+camera_day+'/images/'
                        for image in os.listdir(camera_day_path):
                            image_path = camera_day_path+image
                            image = Image.open(image_path).convert("RGB")
                            log.info(f'Checking image: {image_path}')
                            buffered = BytesIO()
                            image.save(buffered, format="JPEG")
                            base64_str = base64.b64encode(buffered.getvalue())
                            entities = self.qa_for_entities(image=base64_str)
                            if not entities == []:
                                log.info(f'Found entities: {entities}')
                                # move image to entities folder
                                entity = ' '.join(entities)
                                self.home_assistant.send_push_camera(camera_name=camera)
                                if not os.path.exists(self.path+'ftp/entities/'+entity+'/'): os.mkdir(self.path+'ftp/entities/'+entity+'/')
                                shutil.move(image_path, self.path+'ftp/entities/'+entities[0]+'/')
                            else:
                                log.info(f'No entities found, removing image: {image_path}')
                                # move into marked for deletion folder
                                shutil.move(image_path, self.path+'ftp/marked_for_deletion/')

                # remove marked for deletion folder
                shutil.rmtree(self.path+'ftp/marked_for_deletion/')
                
            except BaseException as e:
                log.error(e)
                time.sleep(1)
                shutil.rmtree(self.path+'ftp/marked_for_deletion/')
                retries+=1
                continue
    
if __name__ == "__main__":
    ditto_security_vision = DittoSecurityVision()
    while True:
        try:
            ditto_security_vision.check_ftp_for_entities(
                max_retries=100
            )
        except BaseException as e:
            log.error(e)
            time.sleep(5)
            continue