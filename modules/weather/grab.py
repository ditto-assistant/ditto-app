"""'
weather application using python-weather.

author: Omar Barazanji

ref:
1) https://pypi.org/project/python-weather/
"""

# import the module
import python_weather
import asyncio


class Weather:
    def __init__(self, location="Auburn Alabama"):
        self.location = location
        self.response = ""

    # get weather function... from ref (1)
    async def getweather(self):
        # declare the client. format defaults to metric system (celcius, km/h, etc.)
        client = python_weather.Client(format=python_weather.IMPERIAL)

        # fetch a weather forecast from a city
        weather = await client.find(self.location)

        # returns the current day's forecast temperature (int)
        curr_temp = weather.current.temperature
        self.response = '{"curr_temp" : "%s"}' % curr_temp
        # get the weather forecast for a few days (implement later!)
        # for forecast in weather.forecasts:
        #     print(str(forecast.date), forecast.sky_text, forecast.temperature)

        # close the wrapper once done
        await client.close()

    def get_weather(self):
        loop = asyncio.get_event_loop()
        loop.run_until_complete(self.getweather())
        return self.response


if __name__ == "__main__":
    weather = Weather()
    weather.get_weather()
