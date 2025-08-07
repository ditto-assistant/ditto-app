import React from "react"
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition"

interface SpeechDebugInfoProps {
  showDetails?: boolean
}

const SpeechDebugInfo: React.FC<SpeechDebugInfoProps> = ({
  showDetails = false,
}) => {
  const {
    isSupported,
    isListening,
    transcript,
    finalTranscript,
    interimTranscript,
    error,
    browserSupportMessage,
  } = useSpeechRecognition()

  if (!showDetails) {
    return null
  }

  return (
    <div className="speech-debug-info fixed bottom-4 right-4 max-w-sm p-4 bg-black/80 text-white text-xs rounded-lg z-50 max-h-96 overflow-y-auto">
      <div className="space-y-2">
        <h4 className="font-bold text-yellow-400">Speech Debug Info</h4>

        <div className="space-y-1">
          <div>
            <span className="text-gray-300">Supported:</span>{" "}
            <span className={isSupported ? "text-green-400" : "text-red-400"}>
              {isSupported ? "Yes" : "No"}
            </span>
          </div>

          <div>
            <span className="text-gray-300">Listening:</span>{" "}
            <span className={isListening ? "text-green-400" : "text-gray-400"}>
              {isListening ? "Yes" : "No"}
            </span>
          </div>

          {error && (
            <div className="text-red-400">
              <span className="text-gray-300">Error:</span> {error}
            </div>
          )}

          {browserSupportMessage && (
            <div className="text-orange-400">
              <span className="text-gray-300">Browser:</span>{" "}
              {browserSupportMessage}
            </div>
          )}
        </div>

        <div className="border-t border-gray-600 pt-2 space-y-2">
          <div>
            <div className="text-blue-400 font-semibold">Final Transcript:</div>
            <div className="bg-blue-900/30 p-2 rounded text-xs break-words min-h-[2rem]">
              {finalTranscript || "(empty)"}
            </div>
          </div>

          <div>
            <div className="text-yellow-400 font-semibold">
              Interim Transcript:
            </div>
            <div className="bg-yellow-900/30 p-2 rounded text-xs break-words min-h-[2rem]">
              {interimTranscript || "(empty)"}
            </div>
          </div>

          <div>
            <div className="text-green-400 font-semibold">
              Combined Transcript:
            </div>
            <div className="bg-green-900/30 p-2 rounded text-xs break-words min-h-[2rem]">
              {transcript || "(empty)"}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400 border-t border-gray-600 pt-2">
          Platform:{" "}
          {navigator.userAgent.includes("Mobile") ? "Mobile" : "Desktop"}
          <br />
          Language: {navigator.language}
        </div>
      </div>
    </div>
  )
}

export default SpeechDebugInfo
