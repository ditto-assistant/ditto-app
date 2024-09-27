// sharedMic.js

class SharedMic {
    constructor() {
        this.audioContext = null;
        this.stream = null;
    }

    async getMicStream() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // Ensure the audio context is running
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        if (!this.stream) {
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (error) {
                console.error('Error accessing microphone:', error);
                alert('Microphone access is required for speech recognition.');
                throw error; // Re-throw to handle further up if needed
            }
        }
        return this.stream;
    }

    stopMicStream() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            // Close the audio context only if it's running
            if (this.audioContext.state !== 'closed') {
                this.audioContext.close();
            }
            this.audioContext = null;
        }
    }
}

const sharedMicInstance = new SharedMic();
export default sharedMicInstance;