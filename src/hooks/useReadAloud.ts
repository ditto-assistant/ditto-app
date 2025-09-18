import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { requestReadAloud, ReadTarget } from "@/api/readAloud"
import { useAuth } from "@/hooks/useAuth"

export interface UseReadAloud {
  isSupported: boolean
  isLoading: boolean
  isPlaying: boolean
  audioUrl: string | null
  error: string | null
  currentPairId: string | null
  currentTarget: ReadTarget | null
  play: (pairID: string, target?: ReadTarget) => Promise<void>
  pause: () => void
  resume: () => void
  stop: () => void
}

export function useReadAloud(): UseReadAloud {
  const { user } = useAuth()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentPairId, setCurrentPairId] = useState<string | null>(null)
  const [currentTarget, setCurrentTarget] = useState<ReadTarget | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const isSupported = useMemo(() => typeof Audio !== "undefined", [])

  useEffect(() => {
    if (!audioRef.current && isSupported) {
      audioRef.current = new Audio()
      audioRef.current.addEventListener("playing", () => setIsPlaying(true))
      audioRef.current.addEventListener("pause", () => setIsPlaying(false))
      audioRef.current.addEventListener("ended", () => setIsPlaying(false))
      audioRef.current.addEventListener("error", () => {
        setError("Audio playback error")
        setIsPlaying(false)
      })
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
        audioRef.current.load()
      }
      abortRef.current?.abort()
      setCurrentPairId(null)
      setCurrentTarget(null)
    }
  }, [isSupported])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.src) {
      void audioRef.current.play()
    }
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setCurrentPairId(null)
    setCurrentTarget(null)
    setAudioUrl(null)
  }, [])

  const play = useCallback(
    async (pairID: string, target: ReadTarget = "response") => {
      if (!user?.uid) {
        setError("Not authenticated")
        return
      }
      setError(null)

      // Check if we're trying to play the same audio that's currently loaded
      const isSameAudio = currentPairId === pairID && currentTarget === target

      if (isSameAudio && audioRef.current && audioRef.current.src) {
        // Same audio, just resume if paused
        try {
          await audioRef.current.play()
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e))
        }
        return
      }

      // Different audio or no audio loaded - stop current audio first
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause()
      }

      // Set current audio info and start loading
      setCurrentPairId(pairID)
      setCurrentTarget(target)
      setIsLoading(true)
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort

      try {
        const res = await requestReadAloud(
          user.uid,
          pairID,
          target,
          abort.signal
        )

        // Backend now always returns JSON with URL
        const data = (await res.json()) as { url?: string }
        const url = data.url
        if (!url) throw new Error("Invalid response: missing url")

        setAudioUrl(url)

        if (audioRef.current) {
          audioRef.current.src = url
          await audioRef.current.play()
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        // Clear current audio info on error
        setCurrentPairId(null)
        setCurrentTarget(null)
      } finally {
        setIsLoading(false)
      }
    },
    [user?.uid, currentPairId, currentTarget]
  )

  return {
    isSupported,
    isLoading,
    isPlaying,
    audioUrl,
    error,
    currentPairId,
    currentTarget,
    play,
    pause,
    resume,
    stop,
  }
}
