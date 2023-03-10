from modules.ditto_activation.main import HeyDittoNet
heyditto = HeyDittoNet(
    model_type='CNN-LSTM',
    path='modules/ditto_activation/',
    tflite=True
)
while True:
    heyditto.listen_for_name(reinforce=True)