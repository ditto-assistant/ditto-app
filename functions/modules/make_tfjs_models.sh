#!/bin/bash

# Convert TensorFlow SavedModel format to TensorFlow.js Graph Model format

# Create output directory if it doesn't exist
mkdir -p tfjs_models

# Convert models
tensorflowjs_converter --input_format=keras --output_format=tfjs_layers_model models/GoogleSearch.h5 tfjs_models/GoogleSearch
tensorflowjs_converter --input_format=keras --output_format=tfjs_layers_model models/HomeAssistant.h5 tfjs_models/HomeAssistant
tensorflowjs_converter --input_format=keras --output_format=tfjs_layers_model models/HTMLAgent.h5 tfjs_models/HTMLAgent
tensorflowjs_converter --input_format=keras --output_format=tfjs_layers_model models/ImageGeneration.h5 tfjs_models/ImageGeneration
tensorflowjs_converter --input_format=keras --output_format=tfjs_layers_model models/OpenSCADAgent.h5 tfjs_models/OpenSCADAgent

echo "Conversion complete. TensorFlow.js models are in the tfjs_models directory."
