import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { requestReadAloud } from "@/api/readAloud"
import { useAuth } from "@/hooks/useAuth"

export interface UseReadAloud {
  isSupported: boolean
  isLoading: boolean
  isPlaying: boolean
  audioUrl: string | null
  error: string | null
  play: (pairID: string) => Promise<void>
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
  }, [])

  const play = useCallback(
    async (pairID: string) => {
      if (!user?.uid) {
        setError("Not authenticated")
        return
      }
      setError(null)
      setIsLoading(true)
      abortRef.current?.abort()
      const abort = new AbortController()
      abortRef.current = abort

      try {
        const res = await requestReadAloud(user.uid, pairID, abort.signal)
        const contentType = res.headers.get("content-type") || ""
        if (contentType.includes("application/json")) {
          // Cache hit path: immediate JSON with URL
          const data = (await res.json()) as { url?: string }
          const url = data.url
          if (!url) throw new Error("Invalid response: missing url")
          setAudioUrl(url)
          if (audioRef.current) {
            audioRef.current.src = url
            await audioRef.current.play()
          }
        } else {
          // Streaming audio path; we must buffer the stream and create an object URL
          const reader = res.body?.getReader()
          if (!reader) throw new Error("No response body")
          const chunks: Uint8Array[] = []
          // Read to completion while we also feed to a SourceBuffer alternative
          // Simpler: accumulate and play when sufficient; acceptable since TTS is short
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) chunks.push(value)
          }
          const blob = new Blob(chunks, { type: contentType || "audio/mpeg" })
          const url = URL.createObjectURL(blob)
          setAudioUrl(url)
          if (audioRef.current) {
            audioRef.current.src = url
            await audioRef.current.play()
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setIsLoading(false)
      }
    },
    [user?.uid]
  )

  return {
    isSupported,
    isLoading,
    isPlaying,
    audioUrl,
    error,
    play,
    pause,
    resume,
    stop,
  }
}
