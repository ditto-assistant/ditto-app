"""
Driver for gpt-2 using gpt-2 simple Python package.

note: tensorflow or tensorflow-gpu version 1.15 to work.
"""

import gpt_2_simple as gpt2
import os

gpt2_model = "124M"

if not os.path.isdir(os.path.join("models", gpt2_model)):
	print(f"Downloading {gpt2_model} model...")
	gpt2.download_gpt2(model_name=gpt2_model)   # model is saved into current directory under /models/124M/

class Prompt:

    def __init__(self):
        self.prompt = ""
        self.session = gpt2.start_tf_sess()
        self.model = ''
        
    def load_model(self, model):
        self.model = model
        self.model_corpus = ""
        with open(self.model) as f:
            for x in f.readlines():
                self.model_corpus += x
        

    def set_model(self):
        # send to gpt-2 to generate response
        gpt2.finetune(
            self.session,
            dataset=self.model,
            model_name=gpt2_model,
        )

    def generate_response(self, prompt):
        self.prompt = prompt
        self.gen = gpt2.generate(self.session, prefix=self.prompt, length=100)


if __name__ == "__main__":
    prompt = Prompt()
    prompt.load_model('test.txt')
    prompt.set_model()
    input("enter to continue...")
    prompt.generate_response('turn off the lights.')