# https://beta.openai.com/docs/guides/fine-tuning

with open('light-toggle.txt', 'r') as f:
    fmt_str = ""
    prompt = ""
    completion = ""
    for x in f.readlines():
        if "Q:" in x:
            prompt = x.strip("\n")+"\\n"
        elif "A:" in x:
            completion = x.strip("\n")+"\\n"
            fmt_str += '{"prompt": "%s", "completion": "%s"}\n' % (prompt, completion)

    with open('light-toggle-fmt.jsonl', 'w') as r:
        r.writelines(fmt_str)

import os
import openai

openai.api_key = os.getenv("OPENAI_API_KEY")

# upload...

response = openai.File.create(
  file=open("light-toggle-fmt.jsonl"),
  purpose='fine-tune'
)

# grab all files on account (if needed)...

# files = openai.File.list()
# files.to_dict()

# create fine tune model...

# resp = response.to_dict()
# fine_tune_response = openai.FineTune.create(training_file='file-Cw3txi0GKaZBbRHhjOcLjG6H', model='ada')

# see all fine tuned models...

fine_tunes = openai.FineTune.list()
grabbed = fine_tunes.to_dict()
