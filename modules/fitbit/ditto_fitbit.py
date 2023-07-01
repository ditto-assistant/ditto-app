import fitbit
import os


class DittoFitBit:

    def __init__(self):
        self.key, self.secret = self.__get_keys()
        self.client = fitbit.Fitbit(self.key, self.secret, '', '')

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
