import './SendMessage.css';
import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaImage, FaTimesCircle, FaCamera } from 'react-icons/fa';
import { MdFlipCameraIos } from 'react-icons/md';
import { sendPrompt } from '../control/agent';
import { auth, uploadImageToFirebaseStorageBucket } from '../control/firebase';
import sharedMic from '../sharedMic';
import { firebaseConfig } from '../firebaseConfig';
import HeyDitto from "../ditto/activation/heyDitto";

const INACTIVITY_TIMEOUT = 2000; // 2 seconds
/**
 * SendMessage component for handling user input and message sending
 * @param {Object} props - The component props
 * @param {HeyDitto} props.activationModel - The activation model for Ditto
 * @param {boolean} props.activationModelLoading - Indicates if the activation model is loading
 */
export default function SendMessage(props) {
    const [message, setMessage] = useState('');
    const [image, setImage] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isFrontCamera, setIsFrontCamera] = useState(true);
    const textAreaRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const finalTranscriptRef = useRef('');
    const videoRef = useRef();
    const canvasRef = useRef();
    const isMobile = useRef(false);
    const wsRef = useRef(null);
    const inactivityTimeoutRef = useRef(null);

    useEffect(() => {
        isMobile.current = checkIfMobile();
    }, []);

    const checkIfMobile = () => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (props.activationModel.activated) {
                localStorage.setItem('transcribingFromDitto', 'true');
                props.activationModel.activated = false;
                handleMicClick();
            }
        }, 100);
        return () => {
            clearInterval(interval);
        };
    }, [props.activationModelLoading]);

    const handleMicClick = async () => {
        if (isListening) {
            stopRecording();
        } else {
            try {
                finalTranscriptRef.current = '';
                setMessage('');

                const stream = await sharedMic.getMicStream();
                wsRef.current = new WebSocket(firebaseConfig.webSocketURL);

                wsRef.current.onopen = () => {
                    const mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'audio/webm;codecs=opus',
                    });

                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0 && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                            wsRef.current.send(event.data);
                        }
                    };

                    mediaRecorder.onstop = () => {
                        console.log('Media Recording stopped');
                        stopRecording();
                    };

                    mediaRecorder.start(100);
                    mediaRecorderRef.current = mediaRecorder;
                    setIsListening(true);
                };

                wsRef.current.onmessage = (event) => {
                    clearTimeout(inactivityTimeoutRef.current);

                    const receivedText = JSON.parse(event.data);
                    if (receivedText.isFinal) {
                        finalTranscriptRef.current += receivedText.transcript + ' ';
                        setMessage(finalTranscriptRef.current);
                    } else {
                        setMessage(finalTranscriptRef.current + receivedText.transcript);
                    }
                    resizeTextArea();

                    if (localStorage.getItem('transcribingFromDitto') === 'true') {
                        inactivityTimeoutRef.current = setTimeout(() => {
                            stopRecording();
                            handleSubmit();
                        }, INACTIVITY_TIMEOUT);
                    }
                };

                wsRef.current.onclose = () => stopRecording();
                wsRef.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    stopRecording();
                };

            } catch (error) {
                console.error('Error accessing microphone:', error);
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (wsRef.current) {
            wsRef.current.close();
        }
        sharedMic.stopMicStream();
        if (props.activationModel.isListening) {
            props.activationModel.startListening();
        }
        mediaRecorderRef.current = null;
        wsRef.current = null;
        setIsListening(false);
        localStorage.removeItem('transcribingFromDitto');
    };

    const handleImageUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setImage(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleCameraOpen = () => {
        setIsCameraOpen(true);
        startCamera(isFrontCamera);
    };

    const startCamera = (useFrontCamera) => {
        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: useFrontCamera ? 'user' : 'environment' } })
            .then((stream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch((err) => {
                console.error('Error accessing the camera: ', err);
            });
    };

    const handleSnap = () => {
        if (canvasRef.current && videoRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context.drawImage(videoRef.current, 0, 0);
            const imageDataURL = canvasRef.current.toDataURL('image/png');
            setImage(imageDataURL);
            handleCameraClose();
        }
    };

    const handleCameraClose = () => {
        setIsCameraOpen(false);
        stopCameraFeed();
    };

    const stopCameraFeed = () => {
        const stream = videoRef.current?.srcObject;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    const handleClearImage = () => {
        setImage('');
    };

    const toggleCamera = () => {
        setIsFrontCamera(!isFrontCamera);
        stopCameraFeed();
        startCamera(!isFrontCamera);
    };

    const handleSubmit = async (event) => {
        if (event) event.preventDefault();

        const thinkingObjectString = localStorage.getItem('thinking');
        const isThinking = thinkingObjectString !== null;

        if ((message !== '' || finalTranscriptRef.current) && !isThinking) {
            // const userID = localStorage.getItem('userID');
            const userID = auth.currentUser.uid;
            const firstName = localStorage.getItem('firstName');
            let messageToSend = finalTranscriptRef.current || message;
            let imageURI = '';
            if (image) {
                imageURI = await uploadImageToFirebaseStorageBucket(image, userID);
                messageToSend = `![image](${imageURI})\n\n${messageToSend}`;
            }
            setMessage('');
            setImage('');
            finalTranscriptRef.current = '';
            resizeTextArea();
            if (isListening) {
                stopRecording();
            }
            await sendPrompt(userID, firstName, messageToSend, imageURI);
        }
    };

    const onEnterPress = async (e) => {
        if (isMobile.current) {
            if (e.keyCode === 13) {
                e.preventDefault();
                setMessage(message + '\n');
                resizeTextArea();
            }
            return;
        }
        if (e.keyCode === 13 && e.shiftKey === false) {
            e.preventDefault();
            handleSubmit(e);
        } else {
            resizeTextArea();
        }
    };

    const resizeTextArea = () => {
        const textArea = textAreaRef.current;
        if (textArea) {
            textArea.style.height = 'auto';
            textArea.style.height = textArea.scrollHeight + 'px';

            if (textArea.scrollHeight >= 200) {
                textArea.style.overflowY = 'scroll';
                textArea.style.maxHeight = '200px'; // Ensure a max height
            } else {
                textArea.style.overflowY = 'hidden';
                textArea.style.maxHeight = 'none';
            }

            const imagePreview = document.querySelector('.ImagePreview');
            if (imagePreview) {
                imagePreview.style.top = `${textArea.offsetTop - imagePreview.offsetHeight - 10}px`;
            }
        }
    };

    useEffect(() => {
        const handleResize = () => resizeTextArea();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => resizeTextArea(), [message, image]);

    return (
        <div className='Contents'>
            <div className='Bar'>
                <form className='Form' onSubmit={handleSubmit}>
                    <div className='InputWrapper'>
                        <textarea
                            ref={textAreaRef}
                            onKeyDown={onEnterPress}
                            onInput={resizeTextArea}
                            className='TextArea'
                            type='text'
                            value={message}
                            onChange={(e) => {
                                setMessage(e.target.value);
                                if (e.target.value.trim() === '') {
                                    finalTranscriptRef.current = ''; // Reset transcript if user clears the text area
                                }
                            }}
                            rows={1}
                            style={{
                                overflowY: 'hidden',
                                marginRight: '-5px',
                            }}
                        />
                        <FaMicrophone
                            className={`Mic ${isListening ? 'listening' : ''}`}
                            onClick={handleMicClick}
                        />
                        <label htmlFor='image-upload' className='ImageUpload'>
                            <FaImage />
                        </label>
                        <input
                            id='image-upload'
                            type='file'
                            accept='image/*'
                            style={{ display: 'none' }}
                            onChange={handleImageUpload}
                        />
                        <FaCamera className='Camera' onClick={handleCameraOpen} />
                    </div>
                    <input className='Submit' type='submit' value='Send' />

                    {image && (
                        <div className='ImagePreview'>
                            <img src={image} alt='Preview' />
                            <FaTimesCircle className='RemoveImage' onClick={handleClearImage} />
                        </div>
                    )}
                </form>
            </div>

            {isCameraOpen && (
                <div className='CameraOverlay'>
                    <video ref={videoRef} autoPlay className='CameraFeed'></video>
                    <MdFlipCameraIos className='FlipCameraIcon' onClick={toggleCamera} />
                    <button className='CameraSnap' onClick={handleSnap}>
                        Snap
                    </button>
                    <button className='CameraClose' onClick={handleCameraClose}>
                        Close
                    </button>
                </div>
            )}

            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
        </div>
    );
}