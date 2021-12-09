GPT-3 AI Assistant
===================

Custom GPT-3 AI assistant using Vosk, Spotipy, and other APIs. 


Installation Guide
==================

Follow the instructions below that correspond to your environment.


Windows (Python 3.7) 
^^^^^^^^^^^^^^^^^^^^

#. Installer

    * Create a new 3.7 environment.
    * Run installer.py 

#. GPT-3 API Auth

    * Create an accound on openai.com and go to API.
    * Locate API Key and copy to clipboard.
    * Export API key as environment variable:
    
    .. code-block:: console

        $env:OPENAI_API_KEY="your-key-here"

#. Spotipy API Auth

    * Create account on Spotify Developers and create a new application. Locate ID on Dashboard.

    * Navigate to modules/soptify/resources and open spotify.json.

    * Paste Client Id and Secret from Spotify Application Dashboard:

    .. code-block:: console

        {"client-id": "ID_HERE", "client-secret": "ID_HERE"}
    
