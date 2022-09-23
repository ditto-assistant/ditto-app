import json

class WeatherHandler():

    def __init__(self):
        pass

    def handle_response(self, command, sub_cat):
        reply = ''
        if sub_cat == 'none':
            response = json.loads(command.weather_app.get_weather())['curr_temp']
            location = command.weather_app.location
            reply = "[It's currently %s degrees in %s]" % (response, location)
            print(reply+'\n')
        return reply