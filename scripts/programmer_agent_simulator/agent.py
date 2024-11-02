import os
import json
import datetime
import requests
from typing import List, Dict
from dotenv import load_dotenv
import asyncio
import time  # Import time for sleep

load_dotenv(override=True)

from templates import (
    programmer_agent_planner,
    programmer_agent_task_coder,
    programmer_agent_task_applier,
    programmer_agent_continuer,
    html_system_template
)

class ProgrammerAgentSimulator:
    def __init__(self, api_key: str = None):
        """Initialize the simulator with OpenAI API key"""
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
        
        self.api_url = "https://api.openai.com/v1/chat/completions"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

    async def prompt_llm(self, prompt: str, model: str = "gpt-4o-mini") -> str:
        """Send a prompt to OpenAI's API and get the response"""
        max_retries = 5
        retry_delay = 2  # Start with a 2-second delay

        for attempt in range(max_retries):
            try:
                payload = {
                    "model": model,
                    "messages": [
                        {
                            "role": "system",
                            "content": html_system_template()
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.4
                }

                print(f"\033[32m{prompt}\033[0m")

                response = requests.post(
                    self.api_url,
                    headers=self.headers,
                    json=payload
                )
                response.raise_for_status()

                response_content = response.json()["choices"][0]["message"]["content"]

                print(f"\033[33m{response_content}\033[0m")

                return response_content
            
            except requests.exceptions.HTTPError as e:
                if response.status_code == 429:
                    print(f"Rate limit hit. Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    print(f"Error calling OpenAI API: {str(e)}")
                    raise
            except Exception as e:
                print(f"Unexpected error: {str(e)}")
                raise

        raise Exception("Max retries exceeded for OpenAI API request")

    async def design_tasks(self, query: str, script: str) -> str:
        """Use the planner to design tasks based on a query and script"""
        planner_prompt = programmer_agent_planner(query, script)
        return await self.prompt_llm(planner_prompt)

    async def code_tasks(self, task_writeup: str, script: str) -> str:
        """Use the task coder to generate code snippets from a task writeup"""
        coder_prompt = programmer_agent_task_coder(task_writeup, script, "")
        return await self.prompt_llm(coder_prompt)

    async def apply_code(self, code_snippets: str, script: str) -> str:
        """Use the task applier to integrate code snippets into the script"""
        applier_prompt = programmer_agent_task_applier(code_snippets, script)
        return await self.prompt_llm(applier_prompt)

def main(test_use_continuer: bool = False):
    """Main function to run the simulator"""
    simulator = ProgrammerAgentSimulator()
    
    user_prompt = "Add a toggle at the top of the app that toggles back and forth between dark and light mode. Also add three different themes to the app that the user can toggle between."
    html_script = open("PROJECT ZEUS (X).html", "r", encoding="utf-8").read()

    # Example workflow
    loop = asyncio.get_event_loop()
    task_writeup = loop.run_until_complete(simulator.design_tasks(user_prompt, html_script))
    code_snippets = loop.run_until_complete(simulator.code_tasks(task_writeup, html_script))
    final_script = loop.run_until_complete(simulator.apply_code(code_snippets, html_script))

    # strip ```html and ```
    key = '```html'
    if "```javascript" in final_script:
        key = '```javascript'
    elif "```css" in final_script:
        key = '```css'
    use_continuer = False
    try:
        final_script = final_script.replace(key, "").replace("```", "")
    except:
        print("Script is not finished generating, using the continuer...")
        use_continuer = True

    final_script_continued = ""
    if use_continuer or test_use_continuer:
        # test the continuer by removing the last 10% of the final script to the nearest /n
        final_script_snipped = final_script[:-int(len(final_script) * 0.1)]
        # find the nearest /n using .split('\n')[-1]
        final_script_snipped = '\n'.join(final_script_snipped.split('\n')[:-1])
        print("Using the continuer...")
        prompt = programmer_agent_continuer(code_snippets, final_script_snipped)
        final_script_continued = loop.run_until_complete(simulator.prompt_llm(prompt))

        # The final script looks like:
        # ```html
        # <actual HTML content>
        # ```
        # So we need to extract just the HTML content between the markers
        key = '```html'
        if "```javascript" in final_script_continued:
            key = '```javascript'
        elif "```css" in final_script_continued:
            key = '```css'
        final_script_continued = final_script_continued.split(key)[1].split("```")[0].strip()

        # concatenate the final script and the final script continued
        final_script = final_script_snipped + final_script_continued

    # Save the final script to a file with timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    output_filename = f"output-{timestamp}.html"
    with open(output_filename, "w", encoding="utf-8") as f:
        f.write(final_script)
    print(f"Saved final script to {output_filename}")

if __name__ == "__main__":
    main(
        test_use_continuer=False
    )
