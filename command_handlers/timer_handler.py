import json

class TimerHandler():

    def __init__(self):
        pass

    def handle_response(self, command, nlp, prompt):
        ner_response = json.loads(nlp.prompt_ner_timer(prompt))
        second = ner_response['second']
        minute = ner_response['minute']
        second_reply = ''
        minute_reply = ''
        if not second == '' and minute == '':
            if not second == '':
                if int(second) == 1:
                    second_reply = ' second '
                else: second_reply = ' seconds '
            if not minute == '':
                if int(minute) == 1:
                    minute_reply = ' minute '
                else: minute_reply = ' minutes '
            if not second == '' or minute == '':
                s = ''
                m = ''
                if not second == '':
                    s = 's'
                if not minute == '':
                    m = 'm'
                timer_command = minute + m + second + s
                timer_command.replace(' ', '')
                command.toggle_timer(timer_command)
                readable = minute + minute_reply + second + second_reply
                reply = '[Setting timer for %s]' % readable
                print(reply+'\n')
        else:
            reply = '[Invalid timer command]'
            print(reply+'\n')

        return reply