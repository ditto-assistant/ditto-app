set dotenv-load

run:
    (cd ..; source ditto/bin/activate; cd assistant; python main.py)

dotenv:
    cp .env.example .env

install:
    (cd ..; python -m venv ditto; source ditto/bin/activate; pip install -r requirements.txt)