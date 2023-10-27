from transformers import AutoModelForCausalLM, AutoProcessor
from PIL import Image
import torch

class DittoImageCaption:
    def __init__(self):
        self.load_model()
        self.generated_caption = "Loading..."

    def load_model(self):
        try:
            checkpoint = "microsoft/git-base"
            self.processor = AutoProcessor.from_pretrained(checkpoint)
            self.model = AutoModelForCausalLM.from_pretrained(checkpoint)
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        except:
            print("Error loading image caption model...")
            self.model  = []

    def get_caption(self, image_path=None, image: Image = None):
        if image_path:
            image = Image.open(full_path)
        elif image:
            image = image
        else:
            print("No image provided...")
            return None
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)
        pixel_values = inputs.pixel_values
        generated_ids = self.model.generate(pixel_values=pixel_values, max_length=50)
        self.generated_caption = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

if __name__ == '__main__':

    path = 'C:/Users/ozanj/Pictures/Screenshots/'
    image = 'Screenshot_20221110_022553.png'
    full_path = path + image

    ditto_image_caption = DittoImageCaption()

    generated_caption = ditto_image_caption.get_caption(image_path=full_path)
    print(generated_caption)