import numpy as np
from PIL import Image
import os
import random

labels = []
images = []

faces_dir = "faces"
background_dir = "background"

faces = list(os.listdir(faces_dir))
backgrounds = list(os.listdir(background_dir))

random.shuffle(faces)
random.shuffle(backgrounds)

print(f"\n[Loaded {len(faces)} faces {len(backgrounds)} backgrounds.]\n")

for ndx, face in enumerate(faces):
    photo_dir = faces_dir + f"/{face}"

    if ndx == 9000:
        break

    # Load the image
    image = Image.open(photo_dir).convert("RGB")
    image = np.asarray(image.resize((60, 60), Image.Resampling.NEAREST))

    images.append(image)
    labels.append(1)


for background in backgrounds:
    photo_dir = background_dir + f"/{background}"

    # Load the image
    image = Image.open(photo_dir).convert("RGB")
    image = np.asarray(image.resize((60, 60), Image.Resampling.NEAREST))

    images.append(image)
    labels.append(0)


print("\n[Saving x and y as .npy files...]\n")
np.save("x.npy", np.array(images).astype("float32"))
np.save("y.npy", np.array(labels))
