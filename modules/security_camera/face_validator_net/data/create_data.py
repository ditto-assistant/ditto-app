import numpy as np
from PIL import Image
import os

labels = []
images = []

faces_dir = 'Lfw_cut'
background_dir = 'background'

faces = list(os.listdir(faces_dir))
backgrounds = list(os.listdir(background_dir))

print(f'\n[Loaded {len(faces)} faces {len(backgrounds)} backgrounds.]\n')

for ndx, face_name in enumerate(faces):
    if ndx == 501:
        break

    photo_path = faces_dir+f'/{face_name}'
    face_photos = list(os.listdir(photo_path))
    for f in face_photos:
        if '.jpg' in f:
            face_photo = f

    # Load the image
    image = Image.open(photo_path+'/'+face_photo).convert('L')
    image = np.asarray(image.resize((60, 60), Image.Resampling.NEAREST))

    images.append(image)
    labels.append(1)


for background in backgrounds:
    photo_dir = background_dir+f'/{background}'

    # Load the image
    image = Image.open(photo_dir).convert('L')
    image = np.asarray(image.resize((60, 60), Image.Resampling.NEAREST))

    images.append(image)
    labels.append(0)


print('\n[Saving x and y as .npy files...]\n')
np.save('x.npy', np.array(images).astype('float32'))
np.save('y.npy', np.array(labels))
