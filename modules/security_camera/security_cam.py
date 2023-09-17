import webbrowser
import json
import os


class SecurityCam:
    def __init__(self, path) -> None:
        self.path = path + "/modules/security_camera/"
        self.__load_config()

    def __load_config(self):
        if not "config.json" in os.listdir(self.path):
            with open(self.path + "config.json", "w") as f:
                template = '{"camera_name": "http://local_ip:42052"}'
                f.write(template)
        with open(self.path + "config.json", "r") as f:
            self.cameras = json.load(f)

    def open_cam(self, name):
        if name.lower() == "all":
            for camera in self.cameras.keys():
                webbrowser.open(self.cameras[camera])
        else:
            for camera in self.cameras.keys():
                if name.lower() in camera.lower():
                    webbrowser.open(self.cameras[camera])


if __name__ == "__main__":
    cam = SecurityCam()
    cam.open_cam("front door")
