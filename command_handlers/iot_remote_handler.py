import json

from modules.home_assistant.home_assistant import HomeAssistant


class IOTRemoteHandler():
    """
    Handler for IOT devices like TVs, Vacuum Cleaners, Dish washers, or any other 
    Google / Alexa ready device.

    Runs only 4 commands: 
    "start", "stop", "pause", and "resume".
    
    For example: 'pause the dish washer'
    """

    def __init__(self):
        try:
            self.home_assistant = HomeAssistant()
        except BaseException as e:
            print('\nError loading Home Assistant in IOTRemote Module...')
            print(e)

    def handle_response(self, action:str, device_name:str) -> str:
        if action == 'exit': 
            action='stop'
        reply_action = action
        if action == 'pause':
            reply_action = 'pausing'
        elif action == 'start':
            reply_action = 'starting'
        elif action == 'resume':
            reply_action = 'resuming'
        elif action == 'stop':
            reply_action = 'stopping'
        command = f'{reply_action} the {device_name}'
        reply = f'[{command}.]'
        self.home_assistant.send_google_sdk_command(
            command
        )
        return reply
