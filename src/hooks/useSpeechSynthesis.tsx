import { useState, useEffect, useRef, useCallback } from "react"
import { useUser } from "./useUser"

export interface UseSpeechSynthesisReturn {
  // State
  isSupported: boolean
  isPlaying: boolean
  voices: SpeechSynthesisVoice[]
  currentText: string | null
  error: string | null
  
  // Actions
  speak: (text: string) => void
  stop: () => void
  pause: () => void
  resume: () => void
  
  // Settings
  currentVoice: SpeechSynthesisVoice | null
  setVoice: (voice: SpeechSynthesisVoice) => void
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const { data: user } = useUser()
  const speechPrefs = user?.preferences?.speech

  // State
  const [isSupported, setIsSupported] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [currentText, setCurrentText] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Refs
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true)
      synthRef.current = window.speechSynthesis

      // Load available voices
      const loadVoices = () => {
        const availableVoices = synthRef.current?.getVoices() || []
        setVoices(availableVoices)

        // Auto-select voice based on user preferences
        if (availableVoices.length > 0 && speechPrefs) {
          let preferredVoice: SpeechSynthesisVoice | null = null

          // First, try to find voice by name if specified
          if (speechPrefs.voiceName) {
            preferredVoice = availableVoices.find(
              (voice) => voice.name === speechPrefs.voiceName
            ) || null
          }

          // Fallback to language match
          if (!preferredVoice) {
            preferredVoice = availableVoices.find(
              (voice) => voice.lang.startsWith(speechPrefs.voiceLanguage || "en-US")
            ) || null
          }

          // Final fallback to English
          if (!preferredVoice) {
            preferredVoice = availableVoices.find(
              (voice) => voice.lang.startsWith("en")
            ) || availableVoices[0]
          }

          setCurrentVoice(preferredVoice)
        }
      }

      // Load voices immediately and also listen for changes
      loadVoices()
      synthRef.current.addEventListener("voiceschanged", loadVoices)

      return () => {
        synthRef.current?.removeEventListener("voiceschanged", loadVoices)
      }
    } else {
      setError("Speech synthesis is not supported in this browser")
    }
  }, [speechPrefs?.voiceLanguage, speechPrefs?.voiceName])

  // Get the best voice for a given language
  const getBestVoice = useCallback((lang: string = 'en-US'): SpeechSynthesisVoice | null => {
    if (!voices.length) return null
    
    // Define voice quality priorities based on research
    const voiceQualityOrder = [
      // Premium Google voices (highest quality)
      'Google',
      'Microsoft',
      'Amazon',
      'Enhanced',
      'Premium',
      'Neural',
      
      // High-quality system voices
      'Samantha', // macOS
      'Alex', // macOS  
      'Victoria', // macOS
      'Karen', // macOS
      'Moira', // macOS
      'Tessa', // macOS
      'Veena', // macOS
      'Fiona', // macOS
      'Daniel', // macOS
      'Serena', // macOS
      
      // Windows high-quality voices
      'Hazel', // Windows
      'Zira', // Windows
      'David', // Windows
      'Mark', // Windows
      'Catherine', // Windows
      
      // Good quality alternatives
      'Natural',
      'HD',
      'Plus',
      'Pro',
      
      // Fallback to any voice with the right language
      ''
    ]
    
    // Filter voices by language first
    const langVoices = voices.filter(voice => 
      voice.lang.toLowerCase().startsWith(lang.toLowerCase().split('-')[0])
    )
    
    if (!langVoices.length) {
      // Fallback to English if target language not available
      const englishVoices = voices.filter(voice => 
        voice.lang.toLowerCase().startsWith('en')
      )
      if (englishVoices.length) return englishVoices[0]
      return voices[0] || null
    }
    
    // Find the best quality voice for the language
    for (const qualityIndicator of voiceQualityOrder) {
      const qualityVoice = langVoices.find(voice => 
        voice.name.includes(qualityIndicator) || 
        voice.voiceURI.includes(qualityIndicator)
      )
      if (qualityVoice) return qualityVoice
    }
    
    // If no high-quality voice found, prefer:
    // 1. Non-default voices (often higher quality)
    // 2. Voices with longer names (often more descriptive/higher quality)
    // 3. First available voice
    const nonDefaultVoices = langVoices.filter(voice => !voice.default)
    if (nonDefaultVoices.length) {
      // Sort by name length (longer names often indicate better voices)
      nonDefaultVoices.sort((a, b) => b.name.length - a.name.length)
      return nonDefaultVoices[0]
    }
    
    return langVoices[0]
  }, [voices])

  // Set voice based on user preferences or best available
  useEffect(() => {
    if (voices.length && !currentVoice) {
      const userVoiceLang = speechPrefs?.voiceLanguage || 'en-US'
      const bestVoice = getBestVoice(userVoiceLang)
      if (bestVoice) {
        setCurrentVoice(bestVoice)
      }
    }
  }, [voices, currentVoice, speechPrefs?.voiceLanguage, getBestVoice])

  const speak = useCallback(
    (text: string) => {
      if (!synthRef.current || !isSupported) {
        setError("Speech synthesis is not available")
        return
      }

      // Stop any current speech
      synthRef.current.cancel()

      // Create new utterance
      const utterance = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utterance

      // Apply user preferences
      if (speechPrefs) {
        utterance.rate = speechPrefs.voiceRate || 1
        utterance.pitch = speechPrefs.voicePitch || 1
        utterance.volume = speechPrefs.voiceVolume || 1
        utterance.lang = speechPrefs.voiceLanguage || "en-US"
      }

      // Set voice
      if (currentVoice) {
        utterance.voice = currentVoice
      }

      // Set up event listeners
      utterance.onstart = () => {
        setIsPlaying(true)
        setCurrentText(text)
        setError(null)
      }

      utterance.onend = () => {
        setIsPlaying(false)
        setCurrentText(null)
      }

      utterance.onerror = (event) => {
        setIsPlaying(false)
        setCurrentText(null)
        setError(`Speech synthesis error: ${event.error}`)
      }

      utterance.onpause = () => {
        setIsPlaying(false)
      }

      utterance.onresume = () => {
        setIsPlaying(true)
      }

      // Start speaking
      synthRef.current.speak(utterance)
    },
    [isSupported, currentVoice, speechPrefs]
  )

  const stop = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsPlaying(false)
      setCurrentText(null)
    }
  }, [])

  const pause = useCallback(() => {
    if (synthRef.current && isPlaying) {
      synthRef.current.pause()
    }
  }, [isPlaying])

  const resume = useCallback(() => {
    if (synthRef.current && !isPlaying && currentText) {
      synthRef.current.resume()
    }
  }, [isPlaying, currentText])

  const setVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setCurrentVoice(voice)
  }, [])

  return {
    // State
    isSupported,
    isPlaying,
    voices,
    currentText,
    error,
    
    // Actions
    speak,
    stop,
    pause,
    resume,
    
    // Settings
    currentVoice,
    setVoice,
  }
} 