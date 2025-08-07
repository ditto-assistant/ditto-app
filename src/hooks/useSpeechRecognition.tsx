import { useState, useEffect, useRef, useCallback } from "react"
import { useUser } from "./useUser"

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList
  readonly resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
  readonly message: string
}

interface SpeechRecognitionType extends EventTarget {
  continuous: boolean
  grammars: any
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onaudioend: ((this: SpeechRecognitionType, ev: Event) => any) | null
  onaudiostart: ((this: SpeechRecognitionType, ev: Event) => any) | null
  onend: ((this: SpeechRecognitionType, ev: Event) => any) | null
  onerror:
    | ((this: SpeechRecognitionType, ev: SpeechRecognitionErrorEvent) => any)
    | null
  onnomatch:
    | ((this: SpeechRecognitionType, ev: SpeechRecognitionEvent) => any)
    | null
  onresult:
    | ((this: SpeechRecognitionType, ev: SpeechRecognitionEvent) => any)
    | null
  onsoundend: ((this: SpeechRecognitionType, ev: Event) => any) | null
  onsoundstart: ((this: SpeechRecognitionType, ev: Event) => any) | null
  onspeechend: ((this: SpeechRecognitionType, ev: Event) => any) | null
  onspeechstart: ((this: SpeechRecognitionType, ev: Event) => any) | null
  onstart: ((this: SpeechRecognitionType, ev: Event) => any) | null
  abort(): void
  start(): void
  stop(): void
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognitionType
    }
    webkitSpeechRecognition: {
      new (): SpeechRecognitionType
    }
  }
}

export interface UseSpeechRecognitionReturn {
  // State
  isSupported: boolean
  isListening: boolean
  transcript: string
  finalTranscript: string
  interimTranscript: string
  error: string | null

  // Actions
  startListening: () => void
  stopListening: () => void
  abortListening: () => void
  resetTranscript: () => void

  // Browser compatibility info
  browserSupportMessage: string | null
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const { data: user } = useUser()
  const speechPrefs = user?.preferences?.speech

  // State
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [finalTranscript, setFinalTranscript] = useState("")
  const [interimTranscript, setInterimTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [browserSupportMessage, setBrowserSupportMessage] = useState<
    string | null
  >(null)

  // Refs
  const recognitionRef = useRef<SpeechRecognitionType | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognition) {
        setIsSupported(true)
        recognitionRef.current = new SpeechRecognition()

        const recognition = recognitionRef.current

        // Configure recognition
        recognition.continuous = speechPrefs?.enableContinuousListening ?? true
        recognition.interimResults = true
        recognition.maxAlternatives = 1
        recognition.lang = speechPrefs?.inputLanguage || "en-US"

        // Set up event handlers
        recognition.onstart = () => {
          setIsListening(true)
          setError(null)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = ""
          let final = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              final += result[0].transcript
            } else {
              interim += result[0].transcript
            }
          }

          setInterimTranscript(interim)
          if (final) {
            setFinalTranscript((prev) => prev + final)
            setTranscript((prev) => (prev + final).trim())
          }
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          setIsListening(false)

          let errorMessage = "Speech recognition error"

          switch (event.error) {
            case "no-speech":
              errorMessage =
                "No speech was detected. Please try speaking louder or check your microphone."
              break
            case "audio-capture":
              errorMessage =
                "Audio capture failed. Please check your microphone permissions."
              break
            case "not-allowed":
              errorMessage =
                "Microphone access was denied. Please enable microphone permissions."
              break
            case "network":
              errorMessage = "Network error occurred during speech recognition."
              break
            case "language-not-supported":
              errorMessage =
                "The selected language is not supported for speech recognition."
              break
            case "service-not-allowed":
              errorMessage =
                "Speech recognition service is not allowed on this page."
              break
            default:
              errorMessage = `Speech recognition error: ${event.error}`
          }

          setError(errorMessage)
        }

        recognition.onnomatch = () => {
          setError("No speech was recognized. Please try again.")
        }

        recognition.onaudiostart = () => {
          setError(null)
        }

        recognition.onspeechstart = () => {
          setError(null)
        }
      } else {
        // Check browser and provide helpful message
        const userAgent = navigator.userAgent.toLowerCase()
        let message = "Speech recognition is not supported in this browser."

        if (userAgent.includes("firefox")) {
          message =
            "Speech recognition is not yet supported in Firefox. Please try Chrome, Edge, or Safari."
        } else if (
          userAgent.includes("safari") &&
          !userAgent.includes("chrome")
        ) {
          message =
            "Speech recognition may have limited support in Safari. For best results, please try Chrome."
        } else if (userAgent.includes("edge")) {
          message =
            "Speech recognition may have limited support in Edge. For best results, please try Chrome."
        }

        setBrowserSupportMessage(message)
        setError(message)
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [speechPrefs?.enableContinuousListening, speechPrefs?.inputLanguage])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError("Speech recognition is not available")
      return
    }

    if (isListening) {
      return // Already listening
    }

    try {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Reset interim transcript when starting
      setInterimTranscript("")
      setError(null)

      recognitionRef.current.start()
    } catch (error) {
      setError("Failed to start speech recognition. Please try again.")
      console.error("Speech recognition start error:", error)
    }
  }, [isSupported, isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  const abortListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort()
      setIsListening(false)
      setInterimTranscript("")
    }
  }, [])

  const resetTranscript = useCallback(() => {
    setTranscript("")
    setFinalTranscript("")
    setInterimTranscript("")
    setError(null)
  }, [])

  return {
    // State
    isSupported,
    isListening,
    transcript,
    finalTranscript,
    interimTranscript,
    error,

    // Actions
    startListening,
    stopListening,
    abortListening,
    resetTranscript,

    // Browser compatibility info
    browserSupportMessage,
  }
}
