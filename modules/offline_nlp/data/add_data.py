'''
Makes use of Mult-Layer Perceptron model to create custom datasets for different models.

author: Omar Barazanji

Python 3.7.x
'''

import pandas as pd
import os

# light application model
df_light = pd.DataFrame([
    ['lights', 'none', 'red', 'set the lights to red'],
    ['lights', 'none', 'red', 'please set the lights to red'],
    ['lights', 'none', 'red', 'set the lights to red'],
    ['lights', 'none', 'red', 'lights to red'],
    ['lights', 'none', 'white', 'can you set the lights to white please'],
    ['lights', 'none', 'white', 'set the lights to white'],
    ['lights', 'none', 'orange', 'please set the lights to orange'],
    ['lights', 'none', 'orange', 'set the lights to orange'],
    ['lights', 'none', 'yellow', 'set the lights to yellow'],
    ['lights', 'none', 'green', 'set the lights to green'],
    ['lights', 'none', 'blue', 'set the lights to blue'],
    ['lights', 'none', 'purple', 'set the lights to purple'],
    ['lights', 'none', 'sparkle', 'set the lights to sparkle'],
    ['lights', 'none', 'gradient', 'set the lights to gradient'],
    ['lights', 'none', 'red', 'set the lights to red'],
    ['lights', 'none', 'red', 'please set the lights to red'],
    ['lights', 'none', 'red', 'set the lights to red'],
    ['lights', 'none', 'red', 'lights to red'],
    ['lights', 'none', 'white', 'can you set the lights to white please'],
    ['lights', 'none', 'white', 'set the lights to white'],
    ['lights', 'none', 'orange', 'please set the lights to orange'],
    ['lights', 'none', 'orange', 'set the lights to orange'],
    ['lights', 'none', 'yellow', 'set the lights to yellow'],
    ['lights', 'none', 'green', 'set the lights to green'],
    ['lights', 'none', 'blue', 'set the lights to blue'],
    ['lights', 'none', 'purple', 'set the lights to purple'],
    ['lights', 'none', 'sparkle', 'can you set the lights to sparkle'],
    ['lights', 'none', 'sparkle', 'put the the lights on sparkle'],
    ['lights', 'none', 'gradient', 'set the lights to gradient'],
    ['lights', 'none', 'on', 'turn on the lights'],
    ['lights', 'none', 'on', 'lights on'],
    ['lights', 'none', 'off', 'turn off the lights'],
    ['lights', 'none', 'off', 'lights off'],
    ['lights', 'none', 'off', 'shut off the lights'],
    ['lights', 'none', 'on', 'can you you turn on the lights'],
    ['lights', 'bedroom-light', 'off', 'can you turn off the bedroom lights'],
    ['lights', 'bedroom-light', 'on', 'can you turn on the bedroom light'],
    ['lights', 'bedroom-lamp', 'off', 'can you turn off the bedroom lamp'],
    ['lights', 'bedroom-lamp', 'off', 'can you turn on the bedroom lamp'],
    ['lights', 'bedroom-light', 'on', 'turn on the bedroom lights'],
    ['lights', 'bedroom-lamp', 'on', 'turn on the bedroom lamp'],
    ], columns=['Category', 'Subcategory', 'Action', 'Sentence'])

df_music = pd.DataFrame([
    ['music', 'none', 'pause', 'pause music'],
    ['music', 'none', 'resume', 'play music'],
    ['music', 'none', 'pause', 'can you please pause the music'],
    ['music', 'none', 'resume', 'resume music'],
    ['music', 'none', 'resume', 'play music please'],
    ['music', 'none', 'next', 'next song'],
    ['music', 'none', 'next', 'skip this song'],
    ['music', 'none', 'next', 'next track'],
    ['music', 'none', 'previous', 'go back a song'],
    ['music', 'none', 'previous', 'previous song'],
    ['music', 'none', 'previous', 'can you go back to the last song'],
    ], columns=['Category', 'Subcategory', 'Action', 'Sentence'])

df_weather = pd.DataFrame([
    ['weather', 'none', 'none', "what's the weather like today"], # weather in default location
    ['weather', 'location', 'none', "what's the weather like today in Auburn"], # forward to NER
    ['weather', 'none', 'none', "what's the weather"]
    ], columns=['Category', 'Subcategory', 'Action', 'Sentence'])

def extract_prompts(filepath):
    with open(filepath, 'r') as f:
        fmt_str = ""
        prompt = ""
        prompts = []
        completion = ""
        for x in f.readlines():
            if "Q:" in x:
                prompt = x.strip('Q: ').strip('\n')
                if not prompt == '':
                    prompts.append(prompt)
            elif "A:" in x:
                completion = x.strip("\n")+"\\n"
                fmt_str += '{"prompt": "%s", "completion": "%s"}\n' % (prompt, completion)
    return prompts

conv_prompts = extract_prompts('prompts/conversation-application.txt')
mem_prompts = extract_prompts('prompts/memory-application.txt')
spot_prompts = extract_prompts('prompts/spotify-application.txt')
time_prompts = extract_prompts('prompts/timer-application.txt')

# "other" model
other_arr = []
for prompt in conv_prompts:
    other_arr.append(['other', 'none', 'none', prompt])
for prompt in mem_prompts:
    other_arr.append(['other', 'none', 'none', prompt])
for prompt in spot_prompts:
    other_arr.append(['spotify', 'none', 'none', prompt])
for prompt in time_prompts:
    other_arr.append(['timer', 'none', 'none', prompt])
df_other = pd.DataFrame(other_arr, columns=['Category', 'Subcategory', 'Action', 'Sentence'])


df = df_light.append(
    df_music, ignore_index=True).append(
        df_other, ignore_index=True).append(
            df_weather, ignore_index=True
        )

df.to_csv('dataset_ditto.csv', index=False)
