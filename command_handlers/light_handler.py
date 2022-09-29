import json
import numpy as np


class LightHandler():

    def __init__(self):
        self.val_map = np.linspace(0, 65535, 10).tolist()

    def handle_response(self, command, nlp, prompt, action, sub_cat):
        
        try:
            # global lights handler
            if not action == 'numeric' and sub_cat == 'none':
                if 'off' in action:
                    reply = '[Turning off the lights]'
                elif 'on' in action:
                    reply = '[Turning on the lights]'
                else: 
                    reply = '[Setting lights to %s]' % action
                command.toggle_light(action)

            # brightness handlers per light
            elif action=='numeric':
                ner_response = json.loads(nlp.prompt_ner_numeric(prompt))
                value = ner_response['numeric']
                entity = ner_response['entity']
                val_scale = self.val_map[int(value)-1]
                if 'lamp' in entity:
                    command.set_light_brightness(val_scale, 'lamp')
                elif 'bathroom' in entity:
                    command.set_light_brightness(val_scale, 'bathroom')
                elif 'bedroom light' in entity:
                    command.set_light_brightness(val_scale, 'bedroom light')
                reply = '[Setting %s brightness to %d]' % (str(entity),int(value))

            else:
                    
                # bedroom light handler
                if 'bedroom-light' in sub_cat:
                    command.toggle_light_power(action, 'bedroom')
                    if action == 'on':
                        reply = '[Turning on the bedroom lights]'
                    else: reply = '[Turning off the bedroom lights]'


                # bedroom lamp handler
                elif 'bedroom-lamp' in sub_cat:    
                    if action == 'on':
                        reply = '[Turning on the bedroom lamp]'
                        command.toggle_light_power(action, 'lamp')
                    elif action == 'off':
                        reply = '[Turning off the bedroom lamp]'
                        command.toggle_light_power(action, 'lamp')
                    else:
                        reply = '[Setting bedroom lamp to %s]' % action
                        command.toggle_light_color(action, 'lamp')    

                # bathroom handler
                elif 'bathroom' in sub_cat:
                    command.toggle_light_power(action, 'bathroom')
                    if action == 'on':
                        reply = '[Turning on the bathroom lights]'
                    else: reply = '[Turning off the bathroom lights]'
                                                    
        # any errors come here
        except BaseException as e:
            print(e)
            reply = '[Light not found]'
            command.grab_lifx_lights()
                    
        print(reply+'\n')

        return reply
