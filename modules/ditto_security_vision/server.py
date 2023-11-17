# from flask import Flask, render_template, send_from_directory
# import logging
# import os

# log = logging.getLogger("gallery")
# logging.basicConfig(level=logging.INFO)

# app = Flask(__name__)

# @app.route('/')
# def gallery():
#     # Get a list of all image files in the directory
#     image_files = [f for f in os.listdir('ftp/entities/person/') if f.endswith('.jpg') or f.endswith('.png')]
#     # Render the gallery template with the list of image files
#     return render_template('gallery.html', image_files=image_files)

# @app.route('/images/<path:filename>')
# def serve_image(filename):
#     # Serve an image file from the directory
#     return send_from_directory('ftp/entities/person/', filename)

# if __name__ == '__main__':
#     log.info("[Gallery Server Started on Port 22031]")
#     app.run(host='localhost', port=22031)

from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
import logging
import os

from gevent.pywsgi import WSGIServer

log = logging.getLogger("gallery")
logging.basicConfig(level=logging.INFO)

# set Flask app and enable CORS
app = Flask(__name__)
CORS(app)

@app.route('/')
def gallery():
    image_dir = 'ftp/entities/person/'
    # Get a list of all image files in the directory with timestamps
    image_files = [
        (f, os.path.getmtime(os.path.join(image_dir, f)))
        for f in os.listdir(image_dir)
        if f.endswith('.jpg') or f.endswith('.png')
    ]
    # Sort the image files by timestamp in descending order (latest first)
    image_files.sort(key=lambda x: x[1], reverse=True)
    # Extract only the filenames from the sorted list
    sorted_image_files = [f[0] for f in image_files]
    # Render the gallery template with the list of sorted image files
    return render_template('gallery.html', image_files=sorted_image_files)

@app.route('/images/<path:filename>')
def serve_image(filename):
    # Serve an image file from the directory
    return send_from_directory('ftp/entities/person/', filename)

if __name__ == '__main__':

    http_server = WSGIServer(("0.0.0.0", 22031), app, log=log)
    log.info("Gallery Server started on port 22031]")
    http_server.serve_forever()

