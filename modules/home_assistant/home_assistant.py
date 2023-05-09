import os


class HomeAssistant:

    def __init__(self):
        try:
            import homeassistant_api
            self.client = homeassistant_api.Client(
                str(os.environ['HOME_ASSISTANT_API_URL']),
                str(os.environ['HOME_ASSISTANT_API_KEY'])
            )
            self.forecast_id = None  # initialize forecast service id
        except BaseException as e:
            print('Error loading Home Assistant API... Error below:')
            print(e)

    def send_google_sdk_command(self, prompt):
        res = self.client.request(
            'services/google_assistant_sdk/send_text_command', 'POST', data='{"command": "%s"}' % prompt)
        return res

    def get_ha_services(self, services=None, states=None):
        get = 'services'
        if services:
            get = 'services'
        elif states:
            get = 'states'
        res = self.client.request(get, 'GET')
        return res

    def get_forecast(self):
        '''
        Updates HomeAssistant class's forecast state with full forecast service's state.
        Returns response from HA server.
        '''
        res = self.client.request('states', 'GET')
        if self.forecast_id == None:
            for i, service in enumerate(res):
                if 'forecast' in str(service['entity_id']):
                    print(
                        f"\nFound and Saved HA Forecast State ID: {service['entity_id']}\n")
                    self.forecast_id = i
            if self.forecast_id == None:
                print('\nNo HA weather forecast state found...\n')
                return
        if not self.forecast_id == None:
            self.forecast_obj = res[self.forecast_id]
            return self.forecast_obj


if __name__ == "__main__":
    home_assistant = HomeAssistant()
