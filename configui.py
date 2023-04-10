import tkinter as tk
import json
from tkinter import filedialog
import os

class JsonEditorGUI:
    def __init__(self, master):
        self.master = master
        master.title("JSON Editor")
        self.file_paths = ['resources/config.json', 
                           'modules/spotify/resources/spotify.json',
                           'modules/security_camera/config.json',
                           'modules/wolfram/key.json'
                           ]
        self.json_data = []
        self.json_fields = []
        self.create_widgets()
        
    def load_json(self):
        self.json_data.clear()
        self.json_fields.clear()
        for file_path in self.file_paths:
            with open(file_path, 'r') as f:
                json_obj = json.load(f)
                self.json_data.append(json_obj)
                self.json_fields.append(self.render_json_fields(json_obj, file_path))
        
    def save_json(self):
        for i in range(len(self.file_paths)):
            with open(self.file_paths[i], 'w') as f:
                if self.file_paths[i] == 'resources/config.json':
                    keys = self.json_data[i].keys()
                    for key in keys:
                        if 'GOOGLE' in str(key):
                            print('SETTING GOOGLE_APPLICATION_CREDENTIALS ENV VARIABLE')
                            os.environ[key] = self.json_data[i][key]
                            print('done')
                        elif 'SPOTIPY' in str(key):
                            print(f'SETTING SPOTIPY ENV VARIABLE {key}')
                            os.environ[key] = self.json_data[i][key]
                            print('done')
                        elif 'PYGAME' in str(key):
                            print('SETTING PYGAME ENV VARIABLE')
                            os.environ[key] = str(self.json_data[i][key])
                            print('done')
                        elif 'OPENAI' in str(key):
                            print('SETTING OPENAI ENV VARIABLE')
                            os.environ[key] = self.json_data[i][key]
                            print("done")
                        elif 'HOME_ASSISTANT_API_KEY' in str(key):
                            print('SETTING HOME_ASSISTANT_API_KEY ENV VARIABLE')
                            os.environ[key] = self.json_data[i][key]
                            print("done")
                        elif 'HOME_ASSISTANT_API_URL' in str(key):
                            print('SETTING HOME_ASSISTANT_API_URL ENV VARIABLE')
                            os.environ[key] = self.json_data[i][key]
                            print("done")
                            
                json.dump(self.json_data[i], f, indent=4)
        
    def create_widgets(self):
                
        # save button
        self.save_button = tk.Button(self.master, text="Save Changes", command=self.save_json)
        self.save_button.pack()
        
        self.load_json()
        
    def render_json_fields(self, json_obj, file_path):
        header = tk.Label(self.master, text=file_path)
        header.pack()
        fields = []
        for key, value in json_obj.items():
            label = tk.Label(self.master, text=key)
            label.pack()
            entry = tk.Entry(self.master, width=50)
            entry.insert(0, value)
            entry.bind("<Return>", lambda event, key=key, entry=entry: self.update_json(file_path, key, entry.get()))
            entry.pack()
            fields.append(header)
            fields.append(label)
            fields.append(entry)
        return fields
    
    def update_json(self, file_path, key, value):
        for i in range(len(self.file_paths)):
            if self.file_paths[i] == file_path and key in self.json_data[i]:
                self.json_data[i][key] = value
    
root = tk.Tk()
gui = JsonEditorGUI(root)
root.mainloop()