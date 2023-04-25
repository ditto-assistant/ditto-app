set dotenv-load

# run using your ditto venv
run:
    (cd ..; source ditto/bin/activate; cd assistant; python main.py)

# copy .env.example to .env and edit it to your needs
dotenv:
    cp .env.example .env

# create venv and install requirements
install:
    (cd ..; python -m venv ditto; source ditto/bin/activate; cd assistant; pip install -r requirements.txt)