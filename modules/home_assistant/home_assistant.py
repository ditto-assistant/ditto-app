import json
import os
from datetime import datetime
import time
import logging
from requests import get, post

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("home_assistant")


class HomeAssistant:
    def __init__(self):
        try:
            self.url = "http://localhost:8123/api/"
            self.headers = {
                "Authorization": f'Bearer {str(os.environ["HOME_ASSISTANT_API_KEY"])}',
                "Content-Type": "application/json",
            }
            self.forecast_id = None  # initialize forecast service id
        except BaseException as e:
            print("Error loading Home Assistant API... Error below:")
            print(e)

    def send_google_sdk_command(self, prompt):
        log.info(f"Sending Google Assistant SDK Command: {prompt}")
        url = self.url + "services/google_assistant_sdk/send_text_command"
        headers = self.headers
        data = '{"command": "%s"}' % prompt
        res = post(url, headers=headers, data=data)
        log.info(f"Google Assistant SDK Command Response: {res.text}")
        return res

    def send_push_camera(self, camera_name):
        if "camera1" in camera_name:
            self.update_state(
                "input_button.send_camera_push",
                {"state": str(datetime.fromtimestamp(time.time()))},
            )
        elif "camera2" in camera_name:
            self.update_state(
                "input_button.send_camera2_push",
                {"state": str(datetime.fromtimestamp(time.time()))},
            )

    def get_ha_services(self, services=None, states=None):
        log.info(f"Getting HA Services... Services: {services}, States: {states}")
        endpoint = "services"
        if services:
            endpoint = "services"
        elif states:
            endpoint = "states"
        res = get(self.url + endpoint, headers=self.headers)
        # log.info(f"HA Services Response: {res.text}")
        return res

    def get_forecast(self):
        """
        Updates HomeAssistant class's forecast state with full forecast service's state.
        Returns response from HA server.
        """
        res = self.get_ha_services(states=True).json()
        if self.forecast_id == None:
            for i, service in enumerate(res):
                if "forecast" in str(service["entity_id"]):
                    print(
                        f"\nFound and Saved HA Forecast State ID: {service['entity_id']}\n"
                    )
                    self.forecast_id = i
            if self.forecast_id == None:
                print("\nNo HA weather forecast state found...\n")
                return
        if not self.forecast_id == None:
            self.forecast_obj = res[self.forecast_id]
            return self.forecast_obj

    def update_state(self, entity_id: str = None, data: dict = None):
        log.info(f"Updating state for {entity_id} with data: {data}")
        url = self.url + f"states/{entity_id}"
        headers = self.headers
        res = post(url, headers=headers, data=json.dumps(data))
        log.info(f"State Update Response: {res.text}")
        return res


if __name__ == "__main__":
    home_assistant = HomeAssistant()
