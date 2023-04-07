import homeassistant_api
import os

class HomeAssistant:
    
    def __init__(self):
        try:
            self.client = homeassistant_api.Client(
                str(os.environ['HOME_ASSISTANT_API_URL']),
                str(os.environ['HOME_ASSISTANT_API_KEY'])
            )
        except BaseException as e:
            print('Error loading Home Assistant API... Error below:')
            print(e)
    
    def send_google_sdk_command(self, prompt):
        res = self.client.request('services/google_assistant_sdk/send_text_command', 'POST', data='{"command": "%s"}' % prompt)
        return res

if __name__ == "__main__":
    home_assistant = HomeAssistant()
    