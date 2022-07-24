'''
Makes use of Mult-Layer Perceptron model to create custom datasets for different models.

author: Omar Barazanji

Python 3.7.x
'''

import pandas as pd
import json
import os
import numpy as np

facts = np.loadtxt('S08_question_answer_pairs.txt', dtype=str, delimiter='\n')
factual_questions = []
for question in facts:
    q = question.split('\t')[1]
    factual_questions.append(q)
    
# light application model
df_light = pd.DataFrame([

    # basic setting lights globally to colors / modes (no sub-cat)
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
    ['lights', 'none', 'off', 'turn off the lights'],
    ['lights', 'none', 'off', 'turn off the lights'],
    ['lights', 'none', 'off', 'lights off'],
    ['lights', 'none', 'off', 'shut off the lights'],
    ['lights', 'none', 'on', 'can you you turn on the lights'],

    # setting bedroom light sub-cat 
    ['lights', 'bedroom-light', 'off', 'can you turn off the bedroom lights'],
    ['lights', 'bedroom-light', 'on', 'can you turn on the bedroom light'],
    ['lights', 'bedroom-light', 'on', 'turn on the bedroom lights'],
    ['lights', 'bedroom-light', 'off', 'turn off the bedroom lights'],
    ['lights', 'bedroom-light', 'off', 'turn off the bedroom'],
    ['lights', 'bedroom-light', 'on', 'turn on the bed room'],
    ['lights', 'bedroom-light', 'on', 'turn on the bedroom'],

    # setting bedroom lamp sub-cat
    ['lights', 'bedroom-lamp', 'red', 'can you set the bedroom lamp to red'],
    ['lights', 'bedroom-lamp', 'white', 'change the bedroom lamp color to white'],
    ['lights', 'bedroom-lamp', 'blue', 'can you set the bedroom lamp to blue'],
    ['lights', 'bedroom-lamp', 'orange', 'bedroom lamp orange'],
    ['lights', 'bedroom-lamp', 'yellow', 'change the bed room lamp to yellow'],
    ['lights', 'bedroom-lamp', 'yellow', 'set the bedroom lamp to yellow'],
    ['lights', 'bedroom-lamp', 'pink', 'set the bedroom lamp to pink'],
    ['lights', 'bedroom-lamp', 'purple', 'set the bedroom lamp to purple'],
    ['lights', 'bedroom-lamp', 'green', 'please change the bedroom lamp to green'],
    ['lights', 'bedroom-lamp', 'blue', 'set the lamp to blue'],
    ['lights', 'bedroom-lamp', 'orange', 'set the lamp to Orange'],
    ['lights', 'bedroom-lamp', 'white', 'set the lamp to white'],
    ['lights', 'bedroom-lamp', 'yellow', 'can you change the lamp to yellow'],
    ['lights', 'bedroom-lamp', 'on', 'turn on the bedroom lamp'],
    ['lights', 'bedroom-lamp', 'off', 'turn off the bedroom lamp'],
    ['lights', 'bedroom-lamp', 'off', 'can you please turn off the bedroom lamp'],
    ['lights', 'bedroom-lamp', 'off', 'can you turn off the bedroom lamp'],
    ['lights', 'bedroom-lamp', 'on', 'can you turn on the bedroom lamp'],

    # setting bathroom light sub-cat
    ['lights', 'bathroom-light', 'off', 'can you turn off the bathroom lights'],
    ['lights', 'bathroom-light', 'on', 'can you turn on the bathroom light'],
    ['lights', 'bathroom-light', 'on', 'bathroom lights on'],
    ['lights', 'bathroom-light', 'off', 'can you turn off the bathroom '],
    ['lights', 'bathroom-light', 'on', 'can you turn on the bathroom'],
    ['lights', 'bathroom-light', 'off', 'can you set the bathroom lights to off'],
    ['lights', 'bathroom-light', 'on', 'can you set the bathroom lights to on'],
    ['lights', 'bathroom-light', 'off', 'turn off the bathroom'],
    ['lights', 'bathroom-light', 'on', 'turn on the bathroom'],
    ['lights', 'bathroom-light', 'off', 'turn off the bath room lights'],
    ['lights', 'bathroom-light', 'off', 'can you please turn off the bath room light'],
    ['lights', 'bathroom-light', 'off', 'turn off the bathroom lights'],

    # adjusting numeric parmeter in lights (forward to NER to extract entity and number)
    ['lights', 'none', 'numeric', "set the bathroom light's brightness to 5"],
    ['lights', 'none', 'numeric', 'bathroom brightness to seven'],
    ['lights', 'none', 'numeric', "set the bathroom brightness to 9"],
    ['lights', 'none', 'numeric', 'please change the bathroom brightness to 10'],
    ['lights', 'none', 'numeric', 'please change the bathroom brightness to 10'],
    ['lights', 'none', 'numeric', 'change brightness in bathroom to 5'],
    ['lights', 'none', 'numeric', 'can you adjust the bathroom brightness to 8'],
    ['lights', 'none', 'numeric', "set the bedroom light's brightness to 4"],
    ['lights', 'none', 'numeric', 'bedroom brightness to eight'],
    ['lights', 'none', 'numeric', "set the bedroom brightness to 7"],
    ['lights', 'none', 'numeric', 'please change the bedroom brightness to 4'],
    ['lights', 'none', 'numeric', 'change the bedroom brightness to 6'],
    ['lights', 'none', 'numeric', 'change brightness in bedroom to 9'],
    ['lights', 'none', 'numeric', 'can you adjust the bedroom brightness to 1'],
    ['lights', 'none', 'numeric', 'can you set the bedroom lights to 9'],
    ['lights', 'none', 'numeric', "set the bedroom lamp's brightness to 5"],
    ['lights', 'none', 'numeric', 'bedroom lamp brightness to seven'],
    ['lights', 'none', 'numeric', "set the bedroom lamp brightness to 9"],
    ['lights', 'none', 'numeric', "please change the lamp's brightness to 10"],
    ['lights', 'none', 'numeric', "please change the bedroom lamp's brightness to 10"],
    ['lights', 'none', 'numeric', 'change brightness of lamp to 5'],
    ['lights', 'none', 'numeric', 'can you adjust the bedroom lamp brightness to 8'],
    ['lights', 'none', 'numeric', 'can you set the bedroom lamp to 2'],
    ['lights', 'none', 'numeric', 'bedroom lamp to 6'],
    ['lights', 'none', 'numeric', 'bedroom light to 6'],
    ['lights', 'none', 'numeric', 'can you set the bedroom lights brightness to 6'],

    


    ], columns=['Category', 'Subcategory', 'Action', 'Sentence'])

df_music = pd.DataFrame([
    ['music', 'none', 'pause', 'pause music'],
    ['music', 'none', 'pause', 'pause'],
    ['music', 'none', 'resume', 'play music'],
    ['music', 'none', 'pause', 'can you please pause the music'],
    ['music', 'none', 'resume', 'resume music'],
    ['music', 'none', 'resume', 'play music please'],
    ['music', 'none', 'next', 'next song'],
    ['music', 'none', 'next', 'go to the next song'],
    ['music', 'none', 'next', 'skip this song'],
    ['music', 'none', 'next', 'next track'],
    ['music', 'none', 'previous', 'go back a song'],
    ['music', 'none', 'previous', 'previous song'],
    ['music', 'none', 'previous', 'can you go back to the last song'],
    ], columns=['Category', 'Subcategory', 'Action', 'Sentence'])

df_weather = pd.DataFrame([
    ['weather', 'none', 'none', "what's the weather like today"], # weather in default location
    ['weather', 'location', 'none', "what's the weather like today in Auburn"], # forward to NER
    ['weather', 'none', 'none', "what's the temperature today"],
    ], columns=['Category', 'Subcategory', 'Action', 'Sentence'])

df_wolfram = pd.DataFrame([
    ['wolfram', 'none', 'none', "can you tell me who the president of the United States was in 1975?"],
    ['wolfram', 'none', 'none', "who was the 16th president of the united states?"],
    ['wolfram', 'none', 'none', "what is the population of canada?"],
    ['wolfram', 'none', 'none', "what's the human population count"],
    ['wolfram', 'none', 'none', "what is the speed of light"],
    ['wolfram', 'none', 'none', "how many cups are in a gallon"],
    ['wolfram', 'none', 'none', "can you tell me how many cups are in a gallon"],
    ['wolfram', 'none', 'none', "who invented the telescope"],
    ['wolfram', 'none', 'none', "who founded tesla"],
    ['wolfram', 'none', 'none', "define apple"],
    ['wolfram', 'none', 'none', "who invented the printing press"],
    ['wolfram', 'none', 'none', "convert 135 lb to kilograms"],
    ['wolfram', 'math', 'none', "what is 2 + 2"],    # math sub_cat should read tts differently ( for example, / = 'over')
    ['wolfram', 'math', 'none', "what's 2 plus 2"],    
    ['wolfram', 'math', 'none', "what is 6.6 / 6"],
    ['wolfram', 'math', 'none', "what is x if 6x = 3?"],
    ['wolfram', 'math', 'none', "what is y if 6y equals 397?"],
    ['wolfram', 'math', 'none', "what's 9 * 6"],
    ['wolfram', 'math', 'none', "what's 1000 / 4"],
    ['wolfram', 'math', 'none', "what's 123456789 / 4"],

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
            # elif "A:" in x:
            #     completion = x.strip("\n")+"\\n"
            #     fmt_str += '{"prompt": "%s", "completion": "%s"}\n' % (prompt, completion)
    return prompts

conv_prompts = extract_prompts('prompts/conversation-application.txt')
conv_arr = []

# adding more to conversation prompt from a modified Kaggle conversation dataset:
# https://www.kaggle.com/vaibhavgeek/conversation-json
with open('conversation.json', 'r') as f:
    conv = json.load(f)
    for group in conv['conversations']:
        for prompt in group:
            conv_arr.append(['conv', 'none', 'none', prompt])

# "conv" model for GPT-3 conversation and more
for prompt in conv_prompts:
    conv_arr.append(['conv', 'none', 'none', prompt])

conv_arr.append(['conv', 'none', 'none', 'can you recall the last time'])
conv_arr.append(['conv', 'none', 'none', 'can you recall anything'])
conv_arr.append(['conv', 'none', 'none', "what's the fastest way to get from point a to point b"])
conv_arr.append(['conv', 'none', 'none', 'like what'])
conv_arr.append(['conv', 'none', 'none', 'sorry to bother you'])
conv_arr.append(['conv', 'none', 'none', 'come with us to our flight to Denver'])
conv_arr.append(['conv', 'none', 'none', "I want to play a game with you"])
conv_arr.append(['conv', 'none', 'none', 'good times'])
conv_arr.append(['conv', 'none', 'none', 'pretty good just working on a midi generative network'])
conv_arr.append(['conv', 'none', 'none', 'is it okay if I ask you some math questions'])
conv_arr.append(['conv', 'none', 'exit', 'bye'])
conv_arr.append(['conv', 'none', 'exit', 'talk to you later'])
conv_arr.append(['conv', 'none', 'exit', 'goodbye'])
conv_arr.append(['conv', 'none', 'exit', 'cancel'])
conv_arr.append(['conv', 'none', 'exit', 'stop'])
conv_arr.append(['conv', 'none', 'exit', 'stop Ditto'])
conv_arr.append(['conv', 'none', 'exit', 'thanks Ditto'])
conv_arr.append(['conv', 'none', 'exit', 'shut up'])
conv_arr.append(['conv', 'none', 'exit', 'stop talking'])
conv_arr.append(['conv', 'none', 'exit', 'please stop'])



spot_prompts = extract_prompts('prompts/spotify-application.txt')
time_prompts = extract_prompts('prompts/timer-application.txt')


# use conv_arr to append sourced data to reinforce other categories.
for prompt in spot_prompts:
    conv_arr.append(['spotify', 'none', 'none', prompt])
for prompt in time_prompts:
    conv_arr.append(['timer', 'none', 'none', prompt])
cnt = 0
for prompt in factual_questions:
    if "NOTTTT  FOUND" in prompt or len(prompt) <= 4:
        continue
    conv_arr.append(['wolfram', 'none', 'none', prompt])
    cnt+=1
    if cnt==100: break

df_other = pd.DataFrame(conv_arr, columns=['Category', 'Subcategory', 'Action', 'Sentence'])

# append all data together to make corpus
# df = df_light.append(
#     df_music, ignore_index=True).append(
#         df_other, ignore_index=True).append(
#             df_weather, ignore_index=True).append(
#                 df_wolfram, ignore_index=True
# )

df = pd.concat([df_light, df_music, df_other, df_weather, df_wolfram], ignore_index=True)

df.to_csv('dataset_ditto.csv', index=False)
