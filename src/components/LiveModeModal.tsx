import React, { useState, useEffect, useRef } from "react"
import { Mic, MicOff, X, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis"
import { useUser } from "@/hooks/useUser"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { triggerHaptic, HapticPattern } from "@/utils/haptics"
import { toast } from "sonner"
import { sendPrompt } from "@/control/agent"
import { useAuth } from "@/hooks/useAuth"

interface LiveModeModalProps {
  isOpen: boolean
  onClose: () => void
  onMessageSent?: (message: string, response: string) => void
}

const LiveModeModal: React.FC<LiveModeModalProps> = ({
  isOpen,
  onClose,
  onMessageSent,
}) => {
  const { user } = useAuth()
  const { data: userData } = useUser()
  const preferences = useModelPreferences()

  const {
    isListening,
    transcript,
    finalTranscript,
    startListening,
    stopListening,
    error: speechError,
    isSupported: isSpeechRecognitionSupported,
    resetTranscript,
  } = useSpeechRecognition()

  const {
    speak,
    stop: stopSpeaking,
    isPlaying,
    error: speechSynthesisError,
    isSupported: isSpeechSynthesisSupported,
  } = useSpeechSynthesis()

  const [conversationHistory, setConversationHistory] = useState<
    Array<{
      type: "user" | "assistant"
      content: string
      timestamp: Date
    }>
  >([])

  const [isAutoSpeak, setIsAutoSpeak] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastResponseRef = useRef<string>("")
  const lastProcessedTranscriptRef = useRef<string>("")

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversationHistory])

  // Handle final transcript submission - prevent duplicates
  useEffect(() => {
    if (finalTranscript && isOpen && !isProcessing) {
      const message = finalTranscript.trim()
      // Only process if this is a new transcript (not already processed)
      if (message && message !== lastProcessedTranscriptRef.current) {
        lastProcessedTranscriptRef.current = message
        handleSendMessage(message)
        // Clear the transcript after processing to prevent re-triggers
        resetTranscript()
      }
    }
  }, [finalTranscript, isOpen, isProcessing, resetTranscript])

  const handleSendMessage = async (message: string) => {
    if (!user?.uid || !userData || isProcessing || !preferences.preferences)
      return

    setIsProcessing(true)

    // Add user message to conversation
    setConversationHistory((prev) => [
      ...prev,
      {
        type: "user",
        content: message,
        timestamp: new Date(),
      },
    ])

    try {
      // Send through the same agent pipeline as SendMessage
      const response = await sendPrompt(
        user.uid,
        userData.firstName || "",
        message,
        "", // No image in live mode
        preferences.preferences, // Use model preferences from the hook
        () => {}, // No refetch needed in live mode
        undefined, // No streaming callback in live mode
        undefined, // No optimistic ID
        undefined, // No finalize callback
        userData.planTier ?? 0,
        undefined // No memory sync callback
      )

      // Add assistant response to conversation
      setConversationHistory((prev) => [
        ...prev,
        {
          type: "assistant",
          content: response,
          timestamp: new Date(),
        },
      ])

      // Speak the response if auto-speak is enabled
      // In Live Mode, prioritize local auto-speak setting over global preference
      if (isAutoSpeak && isSpeechSynthesisSupported) {
        speak(response)
      }

      // Notify parent component
      if (onMessageSent) {
        onMessageSent(message, response)
      }

      // Store response for reference but don't use it to add to conversation history
      lastResponseRef.current = response
    } catch (error) {
      console.error("Error sending message in Live Mode:", error)
      toast.error("Failed to send message. Please try again.")

      // Add error message to conversation
      setConversationHistory((prev) => [
        ...prev,
        {
          type: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle errors
  useEffect(() => {
    if (speechError) {
      toast.error(speechError)
    }
    if (speechSynthesisError) {
      toast.error(speechSynthesisError)
    }
  }, [speechError, speechSynthesisError])

  const handleToggleListening = () => {
    triggerHaptic(HapticPattern.Medium)

    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const handleToggleAutoSpeak = () => {
    triggerHaptic(HapticPattern.Light)
    setIsAutoSpeak(!isAutoSpeak)

    if (isPlaying) {
      stopSpeaking()
    }
  }

  const handleClose = () => {
    // Stop any ongoing speech activities
    if (isListening) {
      stopListening()
    }
    if (isPlaying) {
      stopSpeaking()
    }
    setConversationHistory([])
    lastResponseRef.current = ""
    lastProcessedTranscriptRef.current = ""
    resetTranscript()
    onClose()
  }

  if (!isOpen) return null

  const hasAnyVoiceSupport =
    isSpeechRecognitionSupported || isSpeechSynthesisSupported

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                  <Mic className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Live Mode</h2>
                  <p className="text-sm text-muted-foreground">
                    Speak naturally with Ditto
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Speech Toggle Button */}
                {isSpeechSynthesisSupported && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleAutoSpeak}
                    className={cn(
                      "h-8 w-8 rounded-full",
                      isAutoSpeak &&
                        "bg-green-100 dark:bg-green-900/20 text-green-600"
                    )}
                    title={
                      isAutoSpeak
                        ? "Disable voice readback"
                        : "Enable voice readback"
                    }
                  >
                    {isAutoSpeak ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                  </Button>
                )}

                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!hasAnyVoiceSupport && (
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 p-3 rounded-md text-sm">
                Voice features are not supported in your browser. Please try
                Chrome for the best experience.
              </div>
            )}

            <Separator />

            {/* Conversation History */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {conversationHistory.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Mic className="h-12 w-12 mx-auto mb-3 text-blue-500/50" />
                  <p className="text-lg font-medium mb-2">Ready to chat!</p>
                  <p className="text-sm">
                    {isSpeechRecognitionSupported
                      ? "Click the microphone below or press Shift+Space to start speaking."
                      : "Voice input is not available in your browser."}
                  </p>
                </div>
              ) : (
                conversationHistory.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      message.type === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg p-3 text-sm",
                        message.type === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-muted"
                      )}
                    >
                      <p>{message.content}</p>
                      <p
                        className={cn(
                          "text-xs mt-1 opacity-70",
                          message.type === "user"
                            ? "text-blue-100"
                            : "text-muted-foreground"
                        )}
                      >
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {/* Show interim transcript */}
              {transcript && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-lg p-3 text-sm bg-blue-100 dark:bg-blue-950/20 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                    <p className="italic">{transcript}</p>
                    <p className="text-xs mt-1 opacity-70">Speaking...</p>
                  </div>
                </div>
              )}

              {/* Show processing indicator */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0ms]"></div>
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:150ms]"></div>
                        <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:300ms]"></div>
                      </div>
                      <span className="text-muted-foreground">
                        Ditto is thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Show speaking indicator */}
              {isPlaying && (
                <div className="flex justify-start">
                  <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-3 text-sm border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-green-600 animate-pulse" />
                      <span className="text-green-700 dark:text-green-300">
                        Ditto is speaking...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Voice Controls */}
            <div className="flex-shrink-0 p-4">
              <div className="flex items-center justify-center gap-4">
                {isSpeechRecognitionSupported ? (
                  <Button
                    size="lg"
                    onClick={handleToggleListening}
                    className={cn(
                      "h-14 w-14 rounded-full transition-all",
                      isListening
                        ? "bg-red-500 hover:bg-red-600 animate-pulse"
                        : "bg-blue-500 hover:bg-blue-600"
                    )}
                    disabled={isProcessing}
                  >
                    {isListening ? (
                      <MicOff className="h-6 w-6" />
                    ) : (
                      <Mic className="h-6 w-6" />
                    )}
                  </Button>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p className="text-sm">Voice input not supported</p>
                  </div>
                )}
              </div>

              <div className="text-center mt-2 text-xs text-muted-foreground">
                {isListening
                  ? "Listening... Click to stop or speak naturally"
                  : "Click to start voice input or press Shift+Space"}
                {isSpeechSynthesisSupported && (
                  <div
                    className={cn(
                      "mt-1",
                      isAutoSpeak ? "text-green-600" : "text-orange-600"
                    )}
                  >
                    {isAutoSpeak
                      ? "🔊 Voice responses ON"
                      : "🔇 Voice responses OFF"}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

export default LiveModeModal
