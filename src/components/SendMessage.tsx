import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { debounce } from "perfect-debounce"
import { toast } from "sonner"
import {
  Plus,
  Image,
  Camera,
  SendHorizonal,
  Expand,
  CreditCard,
  Crown,
  Bolt,
  X,
  Square,
  FileText,
  AudioLines,
} from "lucide-react"
import {
  promptV2BackendBuild,
  cancelPromptLLMV2,
  type PromptV2Content,
} from "@/api/LLM"
import { uploadImage, uploadFile } from "@/api/userContent"
import { PersonalityStorage } from "@/lib/personalityStorage"
import { cn } from "@/lib/utils"
import { HapticPattern, triggerHaptic } from "@/lib/haptics"
import { DEFAULT_MODELS, FREE_MODEL_ID } from "@/constants"
import { ErrorPaymentRequired } from "@/types/errors"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import { useMemoryStats, stringifyTopSubjects } from "@/hooks/useMemoryStats"
import { useComposeContext } from "@/contexts/ComposeContext"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import { useImageViewer } from "@/hooks/useImageViewer"
import { useModal } from "@/hooks/useModal"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { usePlatform } from "@/hooks/usePlatform"
import { usePromptStorage } from "@/hooks/usePromptStorage"
import { useUser } from "@/hooks/useUser"
import { useMemorySyncContext } from "@/contexts/MemorySyncContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SendMessageProps {
  onCameraOpen: () => void
  capturedImage: string | null
  onClearCapturedImage: () => void
  onStop: () => void
}

export default function SendMessage({
  onCameraOpen,
  capturedImage,
  onClearCapturedImage,
  onStop,
}: SendMessageProps) {
  const [images, setImages] = useState<Array<string | File>>(
    capturedImage ? [capturedImage] : []
  )
  const [documents, setDocuments] = useState<File[]>([])
  const [audios, setAudios] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const preferences = useModelPreferences()
  const { setImageUrl } = useImageViewer()
  const balance = useBalance()
  const { isMobile, isIOS, isPWA, safeAreaBottom } = usePlatform()

  const {
    addOptimisticMessage,
    updateOptimisticResponse,
    finalizeOptimisticMessage,
    setOptimisticPairID,
    setImagePartial,
    setImageCompleted,
  } = useConversationHistory()
  const {
    message,
    setMessage,
    openComposeModal,
    isWaitingForResponse,
    setIsWaitingForResponse,
    registerSubmitCallback,
    appendToMessage,
  } = useComposeContext()

  const { clearPrompt } = usePromptStorage()
  const { triggerSync } = useMemorySyncContext()

  const modal = useModal()
  const openTokenModal = modal.createOpenHandler("tokenCheckout")
  const openSubscriptionsTab = modal.createOpenHandler("settings", "general")
  const triggerLightHaptic = useCallback(
    () => triggerHaptic(HapticPattern.Light),
    []
  )

  const { user: authUser } = useAuth()
  const user = useUser()
  const memoryStats = useMemoryStats()

  const [showSalesPitch, setShowSalesPitch] = useState(false)

  const [autoScroll, setAutoScroll] = useState(false)

  const shouldShowSalesPitch = useMemo(() => {
    if (!balance.data || !preferences.preferences) return false
    const balanceRaw = balance.data.balanceRaw || 0
    const hasZeroBalance = balanceRaw <= 0
    const currentModelID = preferences.preferences.mainModel
    const selectedModel = DEFAULT_MODELS.find(
      (model) => model.id === currentModelID
    )
    return hasZeroBalance && !selectedModel?.isFree
  }, [balance.data, preferences.preferences]) // More specific dependencies

  useEffect(() => {
    setShowSalesPitch(shouldShowSalesPitch)
  }, [shouldShowSalesPitch])

  const handleStopGeneration = useCallback(() => {
    if (isWaitingForResponse) {
      console.log("🛑 [SendMessage] Stopping response generation")
      const wasCancelled = cancelPromptLLMV2()
      if (wasCancelled) {
        toast.info("Response generation stopped")
      }
      setIsWaitingForResponse(false)
      onStop()
    }
  }, [isWaitingForResponse, onStop, setIsWaitingForResponse])

  const uploadFiles = useCallback(
    async (
      userID: string,
      fileArrays: {
        images: Array<string | File>
        documents: File[]
        audios: File[]
      }
    ) => {
      const uploadedImageURIs: string[] = []
      const uploadedDocURIs: { url: string; originalFilename: string }[] = []
      const uploadedAudioURIs: { url: string; originalFilename: string }[] = []

      // Track filenames to prevent duplicates within this chat
      const uploadedFilenames = new Set<string>()

      if (fileArrays.images.length > 0) {
        setIsUploading(true)
        try {
          for (const img of fileArrays.images) {
            const res = await uploadImage(userID, img)
            if (res instanceof Error) throw res
            uploadedImageURIs.push(res)
          }
        } finally {
          setIsUploading(false)
        }
      }

      if (fileArrays.documents.length > 0) {
        setIsUploading(true)
        try {
          for (const doc of fileArrays.documents) {
            // Check for duplicate filename
            if (uploadedFilenames.has(doc.name)) {
              throw new Error(
                `File "${doc.name}" has already been uploaded in this chat`
              )
            }
            uploadedFilenames.add(doc.name)

            const res = await uploadFile(userID, doc, "gallery")
            if (res instanceof Error) throw res
            uploadedDocURIs.push({
              url: res.downloadURL,
              originalFilename: res.filename,
            })
          }
        } finally {
          setIsUploading(false)
        }
      }

      if (fileArrays.audios.length > 0) {
        setIsUploading(true)
        try {
          for (const audio of fileArrays.audios) {
            // Check for duplicate filename
            if (uploadedFilenames.has(audio.name)) {
              throw new Error(
                `File "${audio.name}" has already been uploaded in this chat`
              )
            }
            uploadedFilenames.add(audio.name)

            const res = await uploadFile(userID, audio, "audio")
            if (res instanceof Error) throw res
            uploadedAudioURIs.push({
              url: res.downloadURL,
              originalFilename: res.filename,
            })
          }
        } finally {
          setIsUploading(false)
        }
      }

      return { uploadedImageURIs, uploadedDocURIs, uploadedAudioURIs }
    },
    []
  )

  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      if (event) event.preventDefault()
      if (isWaitingForResponse) return

      if (process.env.NODE_ENV === "development") {
        console.log(
          "🚀 [SendMessage] Submit triggered, message length:",
          message.length
        )
      }

      if (
        message === "" &&
        images.length === 0 &&
        documents.length === 0 &&
        audios.length === 0
      )
        return

      const userID = authUser?.uid
      if (!userID) {
        toast.error("Please log in to send a message")
        return
      }
      if (!preferences.preferences) {
        toast.error("Please set your model preferences")
        return
      }

      setIsWaitingForResponse(true)

      try {
        const { uploadedImageURIs, uploadedDocURIs, uploadedAudioURIs } =
          await uploadFiles(userID, {
            images,
            documents,
            audios,
          })

        clearPrompt()
        setMessage("")
        setImages([])
        setDocuments([])
        setAudios([])

        if (process.env.NODE_ENV === "development") {
          console.log("🚀 [SendMessage] Creating optimistic message")
        }
        const optimisticMessageId = addOptimisticMessage(
          message,
          uploadedImageURIs[0] || ""
        )

        const streamingCallback = (chunk: string) => {
          updateOptimisticResponse(optimisticMessageId, chunk)
        }

        const extraInput = [
          ...uploadedImageURIs
            .slice(1)
            .map((u) => ({ type: "image" as const, content: u })),
          ...uploadedDocURIs.map(({ url, originalFilename }) => ({
            type: "application/pdf" as const,
            content: url,
            originalFilename,
          })),
          ...uploadedAudioURIs.map(({ url, originalFilename }) => ({
            type: "audio/mp3" as const,
            content: url,
            originalFilename,
          })),
        ]

        // Build input array per backend types.Content
        const input: PromptV2Content[] = []
        if (process.env.NODE_ENV === "development") {
          console.log(
            "📝 [SendMessage] Building input, message length:",
            message.trim().length
          )
        }
        if (message.trim().length > 0) {
          input.push({ type: "text", content: message })
        }
        if (uploadedImageURIs[0]) {
          input.push({ type: "image", content: uploadedImageURIs[0] })
        }
        if (extraInput && extraInput.length > 0) {
          input.push(...extraInput)
        }

        let pairID = optimisticMessageId
        const final = await promptV2BackendBuild({
          input,
          textCallback: streamingCallback,
          onPairID: (id) => {
            pairID = id
            setOptimisticPairID(optimisticMessageId, id)
          },
          onImagePartial: (index, b64) =>
            setImagePartial(optimisticMessageId, index, b64),
          onImageCompleted: (url) =>
            setImageCompleted(optimisticMessageId, url),
          onToolCalls: (toolCalls) =>
            setToolCalls(optimisticMessageId, toolCalls),
          personalitySummary: PersonalityStorage.getPersonalitySummary(userID),
          memoryStats: stringifyTopSubjects(memoryStats.topSubjects),
        })

        // Finalize optimistic message with final text
        finalizeOptimisticMessage(optimisticMessageId, final)

        if (!pairID) {
          console.error("No pairID received from backend")
          return
        }
        try {
          triggerSync(pairID)
        } catch {}
        if (process.env.NODE_ENV === "development") {
          console.log("✅ [SendMessage] Prompt completed successfully")
        }
      } catch (error) {
        if (error === ErrorPaymentRequired) {
          toast.error("Please upgrade to a paid plan to continue")
          setShowSalesPitch(true)
        } else if (
          error instanceof Error &&
          error.message === "Request cancelled"
        ) {
          if (process.env.NODE_ENV === "development") {
            console.log("⏹️ [SendMessage] Prompt was cancelled by user")
          }
        } else {
          console.error("❌ [SendMessage] Error in prompt:", error)
          toast.error("Failed to upload file(s). Please try again.")
        }
      } finally {
        setIsWaitingForResponse(false)
        onStop()
      }
    },
    [
      isWaitingForResponse,
      message,
      images,
      documents,
      audios,
      authUser?.uid,
      preferences.preferences,
      setIsWaitingForResponse,
      uploadFiles,
      clearPrompt,
      setMessage,
      addOptimisticMessage,
      memoryStats.topSubjects,
      finalizeOptimisticMessage,
      updateOptimisticResponse,
      setOptimisticPairID,
      setImagePartial,
      setImageCompleted,
      triggerSync,
      onStop,
    ]
  )

  useEffect(() => {
    registerSubmitCallback(() => handleSubmit())
  }, [registerSubmitCallback, handleSubmit])

  useEffect(() => {
    if (capturedImage) {
      setImages((prev) => [capturedImage, ...prev])
    }
  }, [capturedImage])

  const handleImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return
      setImages((prev) => [...prev, ...Array.from(files)])
    },
    []
  )

  const handlePDFUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return
      setDocuments((prev) => [...prev, ...Array.from(files)])
    },
    []
  )

  const handleAudioUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return
      setAudios((prev) => [...prev, ...Array.from(files)])
    },
    []
  )

  const handleClearImage = useCallback(
    (idx: number) => {
      setImages((prev) => prev.filter((_, i) => i !== idx))
      if (idx === 0) onClearCapturedImage()
    },
    [onClearCapturedImage]
  )

  // Memoized handler functions to prevent unnecessary re-renders
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isMobile) {
        if (e.key === "Enter") {
          e.preventDefault()
          appendToMessage("\n")
        }
      } else {
        if (e.key === "Enter") {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            appendToMessage("\n")
          } else if (e.shiftKey) {
            // Allow shift+enter for newlines
          } else {
            e.preventDefault()
            handleSubmit()
          }
        }
      }
    },
    [isMobile, appendToMessage, handleSubmit]
  )

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value),
    [setMessage]
  )

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const items = event.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          setImages((prev) => [blob, ...prev])
          event.preventDefault()
          break
        }
      }
    }
  }, [])

  const handleGalleryClick = useCallback(() => {
    document.getElementById("image-upload")?.click()
  }, [])

  const handlePDFClick = useCallback(() => {
    document.getElementById("pdf-upload")?.click()
  }, [])

  const handleAudioClick = useCallback(() => {
    document.getElementById("audio-upload")?.click()
  }, [])

  const handleCameraClick = useCallback(() => {
    onCameraOpen()
  }, [onCameraOpen])

  const handleSwitchModel = useCallback(() => {
    preferences.updatePreferences({ mainModel: FREE_MODEL_ID })
    setShowSalesPitch(false)
    toast.success("Switched to a free model")
  }, [preferences])

  const handleBuyTokens = useCallback(() => {
    openTokenModal()
  }, [openTokenModal])

  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      triggerLightHaptic()
      openComposeModal()
    },
    [triggerLightHaptic, openComposeModal]
  )

  const vibrateLight = useCallback(() => navigator.vibrate?.(10), [])

  const handleImagePreviewClick = useCallback(
    (imageUrl: string) => {
      setImageUrl(imageUrl)
      modal.createOpenHandler("imageViewer")()
    },
    [setImageUrl, modal]
  )

  const createImageClearHandler = useCallback(
    (idx: number) => (e: React.MouseEvent) => {
      e.stopPropagation()
      handleClearImage(idx)
    },
    [handleClearImage]
  )

  // Memoize expensive className computation
  const textareaClassName = useMemo(
    () =>
      cn(
        "resize-none w-full px-3 py-2.5 pr-12 rounded-lg transition-all", // Added pr-12 for button space
        "min-h-[64px] max-h-[200px]", // grow from ~4 lines up to 200px
        autoScroll ? "overflow-y-auto" : "overflow-y-hidden", // toggle scroll
        "focus-visible:ring-1 focus-visible:ring-primary"
      ),
    [autoScroll]
  )

  // Auto-resize when message changes (debounced)
  useEffect(() => {
    const autoResizeTextarea = () => {
      if (!textAreaRef.current) return

      const ta = textAreaRef.current
      const currentHeight = ta.clientHeight

      // Reset height to auto to get accurate scrollHeight
      ta.style.height = "auto"
      const newHeight = Math.min(ta.scrollHeight, 200)

      // Only update if height actually changed to prevent unnecessary DOM updates
      if (currentHeight !== newHeight) {
        ta.style.height = `${newHeight}px`
        setAutoScroll(ta.scrollHeight > newHeight)
      }
    }

    const debouncedResize = debounce(() => {
      requestAnimationFrame(() => {
        autoResizeTextarea()
      })
    }, 100) // 100ms debounce

    debouncedResize()
  }, [message])

  return (
    <div
      className="w-full z-[200] backdrop-blur-md border-t border-border bg-[var(--footer-background)]"
      style={{
        paddingBottom:
          isIOS && isPWA
            ? `0px`
            : isIOS
              ? `${safeAreaBottom}px`
              : "env(safe-area-inset-bottom)",
      }}
    >
      <form
        className="px-3 py-2 relative w-full"
        onSubmit={handleSubmit}
        onPaste={handlePaste}
      >
        {showSalesPitch ? (
          <Card className="w-full border-none shadow-none bg-transparent">
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-base font-semibold">
                Out of Ditto Tokens
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-1 pb-2 text-sm">
              {(user?.data?.planTier ?? 0) > 0 ? (
                <>
                  You&apos;ve run out of tokens. Upgrade your plan or buy extra
                  tokens to keep using{" "}
                  <Badge variant="outline" className="font-medium ml-1">
                    {preferences.preferences?.mainModel || ""}
                  </Badge>
                </>
              ) : (
                <>
                  Subscribe or buy tokens to keep using{" "}
                  <Badge variant="outline" className="font-medium ml-1">
                    {preferences.preferences?.mainModel || ""}
                  </Badge>
                </>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 p-3 pt-0">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                onClick={handleSwitchModel}
              >
                <Bolt className="mr-2 h-4 w-4" /> Switch to Free Model
              </Button>

              {!user?.data?.planTier && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-start"
                  onClick={openSubscriptionsTab}
                >
                  <Crown className="mr-2 h-4 w-4" /> Subscribe to a Plan
                </Button>
              )}

              {(user?.data?.planTier ?? 0) > 0 &&
                (user?.data?.planTier ?? 0) < 3 && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full justify-start"
                    onClick={openSubscriptionsTab}
                  >
                    <Crown className="mr-2 h-4 w-4" /> Manage Subscription
                  </Button>
                )}

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleBuyTokens}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Buy Tokens
              </Button>
            </CardFooter>
          </Card>
        ) : (
          // Regular send message UI
          <>
            <div className="relative w-full mb-2">
              <Textarea
                ref={textAreaRef}
                onKeyDown={handleKeyDown}
                value={message}
                onChange={handleTextareaChange}
                placeholder="Message Ditto"
                className={textareaClassName}
              />
            </div>

            <div className="flex items-center justify-between w-full relative">
              <div className="flex items-center gap-1.5">
                {/* Expand button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleExpandClick}
                      aria-label="Expand message"
                      className="h-10 w-10 rounded-full bg-background ring-1 ring-blue-500/70 shadow-sm shadow-blue-500/50 hover:scale-110 hover:ring-blue-500 hover:shadow-md hover:shadow-blue-500/80 transition-all"
                    >
                      <Expand className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Expand editor</TooltipContent>
                </Tooltip>

                {/* Media dropdown menu */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Add media"
                          className="h-10 w-10 rounded-full bg-background ring-1 ring-blue-500/70 shadow-sm shadow-blue-500/50 hover:scale-110 hover:ring-blue-500 hover:shadow-md hover:shadow-blue-500/80 transition-all"
                          onPointerDown={vibrateLight}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Add media</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={handleCameraClick}
                      onPointerDown={vibrateLight}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      <span>Camera</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleGalleryClick}
                      onPointerDown={vibrateLight}
                    >
                      <Image className="mr-2 h-4 w-4" />
                      <span>Photo</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handlePDFClick}
                      onPointerDown={vibrateLight}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleAudioClick}
                      onPointerDown={vibrateLight}
                    >
                      <AudioLines className="mr-2 h-4 w-4" />
                      <span>Audio</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Removed bottom-center Live Mode button */}

              <div className="flex items-center gap-1.5">
                {/* Send/Stop button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    {isWaitingForResponse ? (
                      <Button
                        variant="destructive"
                        size="icon"
                        type="button"
                        onClick={handleStopGeneration}
                        aria-label="Stop generation"
                        className="h-10 w-10 rounded-full ring-2 ring-primary/50 shadow-lg shadow-primary/50"
                        onPointerDown={vibrateLight}
                      >
                        <Square className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        type="submit"
                        disabled={showSalesPitch || isUploading}
                        aria-label={
                          isUploading ? "Uploading image..." : "Send message"
                        }
                        className="h-10 w-10 p-0 rounded-full border-none ring-1 ring-blue-500/70 shadow-sm shadow-blue-500/50 hover:scale-110 hover:ring-blue-500 hover:shadow-md hover:shadow-blue-500/80 transition-all hover:bg-transparent focus:bg-transparent"
                        onPointerDown={vibrateLight}
                      >
                        <SendHorizonal className="h-5 w-5" />
                      </Button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {showSalesPitch
                      ? "You need tokens to use this model"
                      : isUploading
                        ? "Uploading image..."
                        : isWaitingForResponse
                          ? "Stop generation"
                          : "Send message"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <input
              id="image-upload"
              type="file"
              multiple
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
            <input
              id="pdf-upload"
              type="file"
              multiple
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={handlePDFUpload}
            />
            <input
              id="audio-upload"
              type="file"
              multiple
              accept="audio/wav, audio/x-wav, audio/mp3, audio/mpeg, audio/mp4"
              style={{ display: "none" }}
              onChange={handleAudioUpload}
            />
          </>
        )}

        {/* Media previews */}
        {(images.length > 0 || documents.length > 0 || audios.length > 0) && (
          <div className="absolute bottom-full left-3 mb-3 flex gap-2 flex-wrap max-w-[calc(100vw-2rem)]">
            {/* Image previews */}
            {images.map((img, idx) => {
              const imageUrl =
                typeof img === "string" ? img : URL.createObjectURL(img)
              return (
                <div
                  key={`img-${idx}`}
                  className="bg-background/85 backdrop-blur-md rounded-md flex items-center shadow-md border border-border overflow-hidden cursor-pointer relative"
                  onClick={() => handleImagePreviewClick(imageUrl)}
                >
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-12 h-12 object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-6 w-6 rounded-full bg-background/50 hover:bg-background/80 text-foreground/80"
                    onClick={createImageClearHandler(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )
            })}

            {/* PDF previews */}
            {documents.map((doc, idx) => (
              <div
                key={`doc-${idx}`}
                className="bg-background/85 backdrop-blur-md rounded-md flex items-center justify-center shadow-md border border-border overflow-hidden relative w-12 h-12"
              >
                <FileText className="w-6 h-6 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-6 w-6 rounded-full bg-background/50 hover:bg-background/80 text-foreground/80"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDocuments((prev) => prev.filter((_, i) => i !== idx))
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {/* Audio previews */}
            {audios.map((audio, idx) => (
              <div
                key={`audio-${idx}`}
                className="bg-background/85 backdrop-blur-md rounded-md flex items-center justify-center shadow-md border border-border overflow-hidden relative w-12 h-12"
              >
                <AudioLines className="w-6 h-6 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-6 w-6 rounded-full bg-background/50 hover:bg-background/80 text-foreground/80"
                  onClick={(e) => {
                    e.stopPropagation()
                    setAudios((prev) => prev.filter((_, i) => i !== idx))
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  )
}
