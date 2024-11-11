import "./SendMessage.css";
import React, { useState, useEffect, useRef } from "react";
import {
  FaMicrophone,
  FaPlus,
  FaImage,
  FaCamera,
  FaTimes,
} from "react-icons/fa";
import { MdFlipCameraIos } from "react-icons/md";
import { sendPrompt } from "../control/agent";
import { auth, uploadImageToFirebaseStorageBucket } from "../control/firebase";
import sharedMic from "../sharedMic";
import { firebaseConfig } from "../firebaseConfig";
import { useDittoActivation } from "@/hooks/useDittoActivation";
import { useIntentRecognition } from "@/hooks/useIntentRecognition";
import { textEmbed } from "../api/LLM";
import { motion, AnimatePresence } from "framer-motion";

const INACTIVITY_TIMEOUT = 2000; // 2 seconds

export default function SendMessage({
  onImageEnlarge,
  onCameraOpen,
  capturedImage,
  onClearCapturedImage,
  showMediaOptions,
  onOpenMediaOptions,
  onCloseMediaOptions,
  updateConversation,
  onFocus,
  onBlur,
}) {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const textAreaRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const finalTranscriptRef = useRef("");
  const videoRef = useRef();
  const canvasRef = useRef();
  const isMobile = useRef(false);
  const wsRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const { model, isLoaded: dittoActivationLoaded } = useDittoActivation();
  const { isLoaded: intentRecognitionLoaded, models: intentRecognitionModels } =
    useIntentRecognition();
  const [isImageEnlarged, setIsImageEnlarged] = useState(false);
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);

  useEffect(() => {
    isMobile.current = checkIfMobile();
  }, []);

  const checkIfMobile = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return (
      /android/i.test(userAgent) ||
      (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (model.activated) {
        localStorage.setItem("transcribingFromDitto", "true");
        model.activated = false;
        handleMicClick();
      }
    }, 100);
    return () => {
      clearInterval(interval);
    };
  }, [dittoActivationLoaded]);

  useEffect(() => {
    if (capturedImage) {
      setImage(capturedImage);
    }
  }, [capturedImage]);

  const handleMicClick = async () => {
    if (isListening) {
      stopRecording();
    } else {
      try {
        finalTranscriptRef.current = "";
        setMessage("");

        const stream = await sharedMic.getMicStream();
        wsRef.current = new WebSocket(firebaseConfig.webSocketURL);

        wsRef.current.onopen = () => {
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: "audio/webm;codecs=opus",
          });

          mediaRecorder.ondataavailable = (event) => {
            if (
              event.data.size > 0 &&
              wsRef.current &&
              wsRef.current.readyState === WebSocket.OPEN
            ) {
              wsRef.current.send(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            console.log("Media Recording stopped");
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
            finalTranscriptRef.current += receivedText.transcript + " ";
            setMessage(finalTranscriptRef.current);
          } else {
            setMessage(finalTranscriptRef.current + receivedText.transcript);
          }
          resizeTextArea();

          if (localStorage.getItem("transcribingFromDitto") === "true") {
            inactivityTimeoutRef.current = setTimeout(() => {
              stopRecording();
              handleSubmit();
            }, INACTIVITY_TIMEOUT);
          }
        };

        wsRef.current.onclose = () => stopRecording();
        wsRef.current.onerror = (error) => {
          console.error("WebSocket error:", error);
          stopRecording();
        };
      } catch (error) {
        console.error("Error accessing microphone:", error);
      }
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    sharedMic.stopMicStream();
    if (model.isListening) {
      model.startListening();
    }
    mediaRecorderRef.current = null;
    wsRef.current = null;
    setIsListening(false);
    localStorage.removeItem("transcribingFromDitto");
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
    document.body.style.overflow = "hidden"; // Prevent scrolling when camera is open
  };

  const startCamera = (useFrontCamera) => {
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: useFrontCamera ? "user" : "environment" },
      })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing the camera: ", err);
      });
  };

  const handleSnap = () => {
    if (canvasRef.current && videoRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      const imageDataURL = canvasRef.current.toDataURL("image/png");
      setImage(imageDataURL);
      handleCameraClose();
    }
  };

  const handleCameraClose = () => {
    setIsCameraOpen(false);
    stopCameraFeed();
    document.body.style.overflow = ""; // Restore scrolling
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
    setImage("");
    onClearCapturedImage();
  };

  const toggleCamera = () => {
    setIsFrontCamera(!isFrontCamera);
    stopCameraFeed();
    startCamera(!isFrontCamera);
  };

  const handleSubmit = async (event) => {
    if (event) event.preventDefault();

    const thinkingObjectString = localStorage.getItem("thinking");
    const isThinking = thinkingObjectString !== null;

    if (isWaitingForResponse) return;

    if ((message !== "" || finalTranscriptRef.current) && !isThinking) {
      setIsWaitingForResponse(true);
      try {
        const userID = auth.currentUser.uid;
        const firstName = localStorage.getItem("firstName");
        let messageToSend = finalTranscriptRef.current || message;
        let imageURI = "";
        if (image) {
          imageURI = await uploadImageToFirebaseStorageBucket(image, userID);
          messageToSend = `![image](${imageURI})\n\n${messageToSend}`;
        }
        setMessage("");
        setImage("");
        finalTranscriptRef.current = "";
        resizeTextArea();
        if (isListening) {
          stopRecording();
        }

        let userPromptEmbedding = await textEmbed(messageToSend);

        await sendPrompt(
          userID,
          firstName,
          messageToSend,
          imageURI,
          userPromptEmbedding,
          updateConversation,
        );
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setIsWaitingForResponse(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (isMobile.current) {
      // On mobile, Enter always creates a new line
      if (e.key === "Enter") {
        e.preventDefault();
        setMessage((prevMessage) => prevMessage + "\n");
        resizeTextArea();
      }
    } else {
      // On web
      if (e.key === "Enter") {
        if (e.ctrlKey || e.metaKey) {
          // Ctrl+Enter or Cmd+Enter adds a new line
          e.preventDefault();
          setMessage((prevMessage) => prevMessage + "\n");
          resizeTextArea();
        } else if (!e.shiftKey) {
          // Enter (without Shift) submits the form
          e.preventDefault();
          handleSubmit();
        }
      }
    }
  };

  const resizeTextArea = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = "auto";
      textArea.style.height = `${Math.min(textArea.scrollHeight, 200)}px`;

      if (textArea.scrollHeight >= 200) {
        textArea.style.overflowY = "auto";
      } else {
        textArea.style.overflowY = "hidden";
      }

      const imagePreview = document.querySelector(".ImagePreview");
      if (imagePreview) {
        imagePreview.style.bottom = `${textArea.offsetHeight + 10}px`;
      }
    }
  };

  useEffect(() => {
    const handleResize = () => resizeTextArea();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => resizeTextArea(), [message, image]);

  // Add this new function to handle pasted data
  const handlePaste = (event) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = () => {
          setImage(reader.result);
        };
        reader.readAsDataURL(blob);
        event.preventDefault();
        break;
      }
    }
  };

  const toggleImageEnlarge = (e) => {
    e.stopPropagation();
    onImageEnlarge(image);
  };

  const toggleImageFullscreen = (e) => {
    e.stopPropagation();
    setIsImageFullscreen(!isImageFullscreen);
  };

  const handleClickOutside = () => {
    if (isImageFullscreen) {
      setIsImageFullscreen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isImageFullscreen]);

  const handlePlusClick = (e) => {
    e.stopPropagation();
    onOpenMediaOptions();
  };

  const handleGalleryClick = (e) => {
    e.preventDefault(); // Add this line
    e.stopPropagation();
    document.getElementById("image-upload").click();
    onCloseMediaOptions();
  };

  const handleCameraClick = (e) => {
    e.preventDefault(); // Add this line
    e.stopPropagation();
    onCameraOpen();
    onCloseMediaOptions();
  };

  return (
    <form className="Form" onSubmit={handleSubmit}>
      <div className="InputWrapper">
        <textarea
          ref={textAreaRef}
          onKeyDown={handleKeyDown}
          onInput={resizeTextArea}
          onPaste={handlePaste}
          className="TextArea"
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (e.target.value.trim() === "") {
              finalTranscriptRef.current = "";
            }
          }}
          rows={1}
          style={{
            overflowY: "hidden",
            marginRight: "-5px",
          }}
          onFocus={() => setIsImageEnlarged(false)}
        />
        <div className="IconsWrapper">
          <FaMicrophone
            className={`Mic ${isListening ? "listening" : ""}`}
            onClick={handleMicClick}
          />
          <FaPlus className="PlusButton" onClick={handlePlusClick} />
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImageUpload}
          />
        </div>
      </div>
      <input
        className={`Submit ${isWaitingForResponse ? "disabled" : ""}`}
        type="submit"
        value="Send"
        disabled={isWaitingForResponse}
      />

      {image && (
        <div className="ImagePreview" onClick={toggleImageEnlarge}>
          <img src={image} alt="Preview" />
          <FaTimes
            className="RemoveImage"
            onClick={(e) => {
              e.stopPropagation();
              handleClearImage();
            }}
          />
        </div>
      )}

      <AnimatePresence>
        {showMediaOptions && (
          <motion.div
            className="MediaOptionsOverlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCloseMediaOptions}
          >
            <motion.div
              className="MediaOptionsContent"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button" // Add this
                className="MediaOption"
                onClick={handleGalleryClick}
              >
                <FaImage /> Photo Gallery
              </button>
              <button
                type="button" // Add this
                className="MediaOption"
                onClick={handleCameraClick}
              >
                <FaCamera /> Camera
              </button>
              <button
                type="button" // Add this
                className="CancelButton"
                onClick={onCloseMediaOptions}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isImageEnlarged && (
        <div className="EnlargedImageOverlay" onClick={toggleImageEnlarge}>
          <div
            className="EnlargedImageContainer"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={image} alt="Enlarged Preview" />
          </div>
        </div>
      )}

      {isImageFullscreen && (
        <div className="FullscreenImageOverlay" onClick={handleClickOutside}>
          <img
            src={image}
            alt="Fullscreen Preview"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
    </form>
  );
}
