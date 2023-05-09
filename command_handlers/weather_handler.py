import json

from modules.home_assistant.home_assistant import HomeAssistant


class WeatherHandler():

    def __init__(self):
        try:
            self.home_assistant = HomeAssistant()
        except BaseException as e:
            print('\nError loading Home Assistant in Weather Module...')
            print(e)

    def handle_response(self, sub_cat, action):
        reply = ''
        self.forecast_obj = self.home_assistant.get_forecast()
        if sub_cat == 'temperature':
            temp = self.forecast_obj['attributes']['temperature']
            unit = self.forecast_obj['attributes']['temperature_unit']
            reply = "[It's currently %s %s outside.]" % (temp, unit)
            print(reply+'\n')
        if sub_cat == 'forecast':
            temp = self.forecast_obj['attributes']['temperature']
            unit = self.forecast_obj['attributes']['temperature_unit']
            forecast = self.forecast_obj['state']
            if 'partlycloudy' in forecast:
                forecast = 'partly cloudy'
            reply = "[Today's forecast is %s. It's currently %s %s outside.]" % (forecast,
                                                                                 temp, unit)
            print(reply+'\n')
        return reply
