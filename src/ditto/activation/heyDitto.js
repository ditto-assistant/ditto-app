// HeyDitto.js 
import sharedMic from '../../sharedMic';

export default class HeyDitto {
    constructor() {
        this.model = null;
        this.audioBuffer = null;
        this.isListening = false;
        this.activated = false;
        this.chunkSize = 4096;
        this.sampleRate = 16000; // Target sample rate 
        this.bufferSize = this.sampleRate; // 1-second buffer size for 16kHz 
        this.processorNode = null;
        this.tf = null; // TensorFlow.js instance
    }

    async loadModel() {
        if (!this.tf) {
            this.tf = await import('@tensorflow/tfjs');
            console.log('TensorFlow.js loaded');
        }
        this.model = await this.tf.loadLayersModel('/model.json');
        console.log('Activation model loaded');
    }

    async startListening() {
        console.log('Starting to listen...');
        this.audioBuffer = new Float32Array(this.bufferSize);
        let bufferOffset = 0;

        // Create a new AudioContext each time we start listening 
        const audioStream = await sharedMic.getMicStream();
        this.audioContext = sharedMic.audioContext; // Use shared audio context 

        try {
            this.processorNode = this.audioContext.createScriptProcessor(this.chunkSize, 1, 1);

            this.processorNode.onaudioprocess = (event) => {
                if (this.isListening) {
                    const inputData = event.inputBuffer.getChannelData(0);
                    const downsampledData = this.downsampleBuffer(inputData, this.audioContext.sampleRate, this.sampleRate);

                    const remainingSpace = this.bufferSize - bufferOffset;
                    const copySize = Math.min(downsampledData.length, remainingSpace);

                    this.audioBuffer.set(downsampledData.slice(0, copySize), bufferOffset);
                    bufferOffset += copySize;

                    if (bufferOffset >= this.bufferSize) {
                        this.makePrediction();
                        bufferOffset = 0; // Reset buffer offset, overwrite existing buffer 
                    }
                }
            };

            const source = this.audioContext.createMediaStreamSource(audioStream);
            source.connect(this.processorNode);
            this.processorNode.connect(this.audioContext.destination);

            this.isListening = true;
        } catch (err) {
            console.error('Error accessing microphone or setting up ScriptProcessorNode:', err);
        }
    }

    downsampleBuffer(buffer, sampleRate, outSampleRate) {
        if (outSampleRate === sampleRate) {
            return buffer;
        }
        if (outSampleRate > sampleRate) {
            throw new Error(`Downsampling rate should be smaller than the original sample rate`);
        }
        const sampleRateRatio = sampleRate / outSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);

        let offsetResult = 0;
        let offsetBuffer = 0;
        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
            let accum = 0, count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }
            result[offsetResult] = accum / count;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }
        return result;
    }

    stopListening() {
        console.log('Stopping listening...');
        try {
            this.isListening = false;
            this.activated = false;
            if (this.processorNode) {
                this.processorNode.disconnect();
                this.processorNode = null;
            }
            sharedMic.stopMicStream(); // Utilize shared resource to stop mic 
        } catch (e) {
            console.error('Error stopping listening:', e);
        }
    }

    async makePrediction() {
        if (!this.audioBuffer || this.audioBuffer.length < this.bufferSize) {
            console.warn('Insufficient audio buffer to make prediction.');
            return;
        }

        if (!this.tf) {
            this.tf = await import('@tensorflow/tfjs');
        }

        let buffer = this.audioBuffer;
        // raise the volume of the audio to make it louder by about 3dB, with a max db of -1 db 
        const max = Math.max(...buffer);
        const min = Math.min(...buffer);
        const maxAbs = Math.max(Math.abs(max), Math.abs(min));
        const scale = Math.min(1.0, 1.0 / maxAbs);
        buffer = buffer.map(x => x * scale);

        let inputTensor = this.tf.signal.stft(this.tf.tensor1d(buffer), 255, 128).abs();
        inputTensor = inputTensor.expandDims(0).expandDims(-1);
        const prediction = this.model.predict(inputTensor);
        const result = await prediction.data();

        if (result[0] >= 0.99) {
            console.log('Ditto name detected!');
            this.activated = true;
        }

        prediction.dispose();
        inputTensor.dispose();
    }
}