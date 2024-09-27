@echo off
gcloud run deploy openai-chat ^
    --source . ^
    --port 5001 ^
    --region us-central1
