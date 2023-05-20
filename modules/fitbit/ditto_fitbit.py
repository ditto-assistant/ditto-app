import fitbit
import os


class DittoFitBit:

    def __init__(self):
        self.key, self.secret = self.__get_keys()
        self.client = fitbit.Fitbit(self.key, self.secret, 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIyM1FXWTIiLCJzdWIiOiJCQzc3WDMiLCJpc3MiOiJGaXRiaXQiLCJ0eXAiOiJhY2Nlc3NfdG9rZW4iLCJzY29wZXMiOiJyc29jIHJlY2cgcnNldCByb3h5IHJwcm8gcm51dCByc2xlIHJjZiByYWN0IHJsb2MgcnJlcyByd2VpIHJociBydGVtIiwiZXhwIjoxNjg0NDE3NDk3LCJpYXQiOjE2ODQzODg2OTd9.3NTEdodBdK5u6zhPf4cJionUbKoos7uEkYhVCc2DWN4', '2855311dd0c26b6ae9fc4fbfb1c3626295dc2150197a12d546fd9bb2202a34a6')

    def __get_keys(self):
        key = ''
        secret = ''
        try:
            key = os.environ['FITBIT_CLIENT_KEY']
            secret = os.environ['FITBIT_CLIENT_SECRET']
        except:
            print(
                'Error loading FITBIT_CLIENT_KEY or FITBIT_CLIENT_SECRET from ENV variable...')
        return key, secret


if __name__ == "__main__":
    ditto_fitbit = DittoFitBit()
