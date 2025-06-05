import { useState, useEffect, useRef, useCallback } from "react"
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
  Settings,
  MessageCircle,
  X,
  Square,
  Brain,
  MessageSquare,
} from "lucide-react"
import { chatV3, type ContentV3, type ChatV3Request } from "@/api/chatV3"
import { uploadImage } from "@/api/userContent"
import { useSessionManager } from "@/hooks/useSessionManager"
import { cn } from "@/lib/utils"
import { HapticPattern, triggerHaptic } from "@/utils/haptics"
import { DITTO_LOGO, DEFAULT_MODELS, FREE_MODEL_ID } from "@/constants"
import { ErrorPaymentRequired } from "@/types/errors"
import { useAuth } from "@/hooks/useAuth"
import { useBalance } from "@/hooks/useBalance"
import { useComposeContext } from "@/contexts/ComposeContext"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler"
import { useModal } from "@/hooks/useModal"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { usePlatform } from "@/hooks/usePlatform"
import { usePromptStorage } from "@/hooks/usePromptStorage"
import { useUser } from "@/hooks/useUser"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
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
import { getDeviceID } from "@/utils/deviceId"
import SessionDetailsModal from "./SessionDetailsModal"

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
  const [isUploading, setIsUploading] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const preferences = useModelPreferences()
  const { handleImageClick } = useImageViewerHandler()
  const balance = useBalance()
  const { isMobile } = usePlatform()
  const {
    addOptimisticMessage,
    updateOptimisticResponse,
    finalizeOptimisticMessage,
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
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const logoButtonRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const modal = useModal()
  const openSettingsModal = modal.createOpenHandler("settings")
  const openSubscriptionsTab = modal.createOpenHandler("settings", "general")
  const openFeedbackModal = modal.createOpenHandler("feedback")
  const openMemoriesOverlay = modal.createOpenHandler("memories")
  const openTokenModal = modal.createOpenHandler("tokenCheckout")
  const triggerLightHaptic = () => triggerHaptic(HapticPattern.Light)

  const { user: authUser } = useAuth()
  const user = useUser()
  const { currentSessionId, setCurrentSessionId } = useSessionManager()

  const [showSalesPitch, setShowSalesPitch] = useState(false)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  // Track if we're in an invalid configuration (zero balance with paid model)
  const [isInvalidConfig, setIsInvalidConfig] = useState(false)

  const [autoScroll, setAutoScroll] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)

  useEffect(() => {
    if (balance.data && preferences.preferences) {
      const balanceRaw = balance.data.balanceRaw || 0
      const hasZeroBalance = balanceRaw <= 0
      const currentModelID = preferences.preferences.mainModel
      const selectedModel = DEFAULT_MODELS.find(
        (model) => model.id === currentModelID
      )
      const selectedModelHasTier = (selectedModel?.minimumTier ?? 0) > 0

      const isInvalid = hasZeroBalance && selectedModelHasTier
      setShowSalesPitch(isInvalid)
      setIsInvalidConfig(isInvalid)
    }
  }, [balance.data, preferences.preferences])

  const handleStopGeneration = useCallback(() => {
    if (isWaitingForResponse && abortController) {
      console.log("🛑 [SendMessage] Stopping response generation")
      abortController.abort()
      setAbortController(null)
      toast.info("Response generation stopped")
      setIsWaitingForResponse(false)
      onStop()
    }
  }, [isWaitingForResponse, abortController, onStop, setIsWaitingForResponse])

  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      if (event) event.preventDefault()
      if (isWaitingForResponse) return
      if (message === "" && images.length === 0) return

      if (isMenuOpen) {
        setIsMenuOpen(false)
      }

      setIsWaitingForResponse(true)
      const controller = new AbortController()
      setAbortController(controller)

      try {
        const userID = authUser?.uid
        if (!userID) {
          toast.error("Please log in to send a message")
          setIsWaitingForResponse(false)
          return
        }
        if (!preferences.preferences) {
          toast.error("Please set your model preferences")
          setIsWaitingForResponse(false)
          return
        }

        // Create the content array for the new API
        const content: ContentV3[] = []

        // Add text content
        if (message.trim()) {
          content.push({
            type: "text",
            text: message.trim(),
          })
        }

        // Handle image uploads if present
        if (images.length > 0) {
          setIsUploading(true)
          try {
            for (const image of images) {
              const uploadResult = await uploadImage(userID, image)
              if (uploadResult instanceof Error) {
                throw uploadResult
              }
              console.log(
                `🚀 [SendMessage] Presigned uploaded image: ${uploadResult}`
              )

              // Add image content to the array
              content.push({
                type: "image",
                imageURL: uploadResult,
              })
            }
          } catch (uploadError) {
            console.error("Error uploading images:", uploadError)
            toast.error("Failed to upload images. Please try again.")
            setIsWaitingForResponse(false)
            setIsUploading(false)
            setAbortController(null)
            return
          } finally {
            setIsUploading(false)
          }
        }

        // Create the request for V3 API
        const chatRequest: ChatV3Request = {
          deviceID: getDeviceID(),
          input: content,
          deepSearchMemories: true, // TODO: Make this configurable from user preferences
          userLocalTime: new Date().toISOString(),
          sessionID: currentSessionId || undefined,
        }

        // Only clear state after successful setup
        clearPrompt()
        setMessage("")
        setImages([])

        console.log("🚀 [SendMessage] Creating optimistic message")
        const displayText = content
          .map((c) =>
            c.type === "text"
              ? c.text
              : c.type === "image"
                ? `![image](${c.imageURL})`
                : ""
          )
          .join("\n\n")
        const firstImageURL = content.find((c) => c.type === "image")?.imageURL

        const optimisticMessageId = addOptimisticMessage(
          displayText,
          firstImageURL
        )

        let accumulatedResponse = ""
        const streamingCallback = (chunk: string) => {
          accumulatedResponse += chunk
          updateOptimisticResponse(optimisticMessageId, chunk)
        }

        const progressCallback = (message: string) => {
          console.log("📊 [SendMessage] Progress:", message)
        }

        const errorCallback = (error: string) => {
          console.error("❌ [SendMessage] SSE Error:", error)
          finalizeOptimisticMessage(optimisticMessageId, `Error: ${error}`)
        }

        const toolCallsCallback = (toolCalls: unknown[]) => {
          console.log("🛠️ [SendMessage] Tool calls:", toolCalls)
          // TODO: Display tool calls in the UI (like "Searching Google...")
        }

        const toolResultsCallback = (toolResults: unknown[]) => {
          console.log("✅ [SendMessage] Tool results:", toolResults)
          // TODO: Display tool results in the UI
        }

        const sessionCreatedCallback = (sessionID: string) => {
          console.log("✅ [SendMessage] New session created:", sessionID)
          setCurrentSessionId(sessionID)
        }

        try {
          await chatV3(
            userID,
            chatRequest,
            streamingCallback,
            progressCallback,
            errorCallback,
            controller.signal,
            toolCallsCallback,
            toolResultsCallback,
            sessionCreatedCallback
          )
          console.log("✅ [SendMessage] Chat completed successfully")

          // Finalize the message with the accumulated response
          if (accumulatedResponse) {
            finalizeOptimisticMessage(optimisticMessageId, accumulatedResponse)
          }
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            console.log("⏹️ [SendMessage] Chat was cancelled by user")
          } else if (error === ErrorPaymentRequired) {
            toast.error("Please upgrade to a paid plan to continue")
            setShowSalesPitch(true)
            setIsInvalidConfig(true)
          } else {
            console.error("❌ [SendMessage] Error in chatV3:", error)
            finalizeOptimisticMessage(
              optimisticMessageId,
              "Sorry, an error occurred while processing your request. Please try again."
            )
          }
        }
      } catch (error) {
        console.error("Error sending message:", error)
      } finally {
        setIsWaitingForResponse(false)
        setAbortController(null)
        onStop()
      }
    },
    [
      isWaitingForResponse,
      message,
      images,
      isMenuOpen,
      setIsWaitingForResponse,
      preferences.preferences,
      clearPrompt,
      authUser?.uid,
      setMessage,
      addOptimisticMessage,
      updateOptimisticResponse,
      finalizeOptimisticMessage,
      currentSessionId,
      setCurrentSessionId,
      onStop,
    ]
  )

  useEffect(() => {
    registerSubmitCallback(() => handleSubmit())
  }, [registerSubmitCallback, handleSubmit])

  useEffect(() => {
    if (capturedImage) {
      setImages([capturedImage])
    }
  }, [capturedImage])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newImages = Array.from(files)
      setImages((prev) => [...prev, ...newImages])
    }
  }

  const handleClearImage = (index?: number) => {
    if (index !== undefined) {
      setImages((prev) => prev.filter((_, i) => i !== index))
    } else {
      setImages([])
      onClearCapturedImage()
    }
  }

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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value)
    },
    [setMessage]
  )

  const handlePaste = (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items
    const pastedImages: File[] = []

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          pastedImages.push(blob)
        }
      }
    }

    if (pastedImages.length > 0) {
      setImages((prev) => [...prev, ...pastedImages])
      event.preventDefault()
    }
  }

  const handleGalleryClick = () => {
    document.getElementById("image-upload")?.click()
  }

  const handleCameraClick = () => {
    onCameraOpen()
  }

  const handleLogoClick = () => {
    // Simple toggle behavior for all platforms
    setIsMenuOpen(!isMenuOpen)
  }

  // Add auto-resize function
  const autoResizeTextarea = useCallback(() => {
    if (!textAreaRef.current) return
    const ta = textAreaRef.current
    ta.style.height = "auto"
    const newHeight = Math.min(ta.scrollHeight, 200)
    ta.style.height = `${newHeight}px`
    // If scrollHeight > newHeight, we're clipped ⇒ allow scroll.
    setAutoScroll(ta.scrollHeight > newHeight)
  }, [])

  // Auto-resize when message changes
  useEffect(() => {
    autoResizeTextarea()
  }, [message, autoResizeTextarea])

  return (
    <div className="w-full z-[300] bg-background backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]">
      <form
        className="px-3 py-2 relative w-full"
        onSubmit={handleSubmit}
        onPaste={handlePaste}
      >
        {showSalesPitch ? (
          <Card className="w-full border-none shadow-none bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between p-3 pb-1">
              <CardTitle className="text-base font-semibold">
                Out of Ditto Tokens
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSalesPitch(false)}
                aria-label="Close sales pitch"
                className="h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-1 pb-2 text-sm">
              Subscribe or buy tokens to keep using{" "}
              <Badge variant="outline" className="font-medium ml-1">
                {preferences.preferences?.mainModel || ""}
              </Badge>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 p-3 pt-0">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  preferences.updatePreferences({ mainModel: FREE_MODEL_ID })
                  setShowSalesPitch(false)
                  setIsInvalidConfig(false)
                  toast.success("Switched to a free model")
                }}
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

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  if (user?.data?.planTier) {
                    openSubscriptionsTab()
                  } else {
                    openTokenModal()
                  }
                }}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {user?.data?.planTier ? "Upgrade Plan" : "Buy Tokens"}
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
                onChange={handleInputChange}
                placeholder="Message Ditto"
                className={cn(
                  "resize-none w-full px-3 py-2.5 rounded-lg transition-all",
                  "min-h-[64px] max-h-[200px]", // grow from ~4 lines up to 200px
                  autoScroll ? "overflow-y-auto" : "overflow-y-hidden", // toggle scroll
                  "focus-visible:ring-1 focus-visible:ring-primary"
                )}
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
                      onClick={(e) => {
                        e.stopPropagation()
                        triggerLightHaptic()
                        openComposeModal()
                      }}
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
                          onPointerDown={() => navigator.vibrate?.(10)}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Add media</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onClick={handleGalleryClick}
                      onPointerDown={() => navigator.vibrate?.(10)}
                    >
                      <Image className="mr-2 h-4 w-4" />
                      <span>Photo Gallery</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleCameraClick}
                      onPointerDown={() => navigator.vibrate?.(10)}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      <span>Camera</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Center section with Ditto logo and session indicator */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                {/* Session indicator button */}
                {currentSessionId && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background ring-1 ring-green-500/70 shadow-sm shadow-green-500/50 hover:scale-110 hover:ring-green-500 hover:shadow-md hover:shadow-green-500/80 transition-all"
                        onClick={() => setShowSessionModal(true)}
                        onPointerDown={triggerLightHaptic}
                      >
                        <MessageSquare className="h-4 w-4 text-green-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      In session: {currentSessionId?.slice(0, 8)}...
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Ditto logo dropdown */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Avatar
                          ref={logoButtonRef as React.RefObject<HTMLDivElement>}
                          className="h-10 w-10 cursor-pointer hover:scale-110 hover:ring-blue-500 hover:shadow-md hover:shadow-blue-500/80 transition-all ring-1 ring-blue-500/70 shadow-sm shadow-blue-500/50"
                          onClick={handleLogoClick}
                          onPointerDown={triggerLightHaptic}
                        >
                          <AvatarImage
                            src={DITTO_LOGO}
                            alt="Ditto"
                            className="h-10 w-10 rounded-full"
                            style={{
                              background:
                                "radial-gradient(circle at center, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #8B00FF 20%, transparent 25%)",
                              animation: "rainbow 10s linear infinite",
                              backgroundSize: "20% 20%",
                              backgroundPosition: "center",
                              backgroundBlendMode: "soft-light",
                            }}
                          />
                        </Avatar>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Menu</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent
                    side="top"
                    align="center"
                    className="w-40 p-2"
                  >
                    <DropdownMenuItem
                      onClick={openMemoriesOverlay}
                      onPointerDown={triggerLightHaptic}
                      className="flex items-center py-3"
                    >
                      <Brain className="mr-3 h-5 w-5" />{" "}
                      <span className="text-lg">Memories</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={openFeedbackModal}
                      onPointerDown={triggerLightHaptic}
                      className="flex items-center py-3"
                    >
                      <MessageCircle className="mr-3 h-5 w-5" />{" "}
                      <span className="text-lg">Feedback</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={openSettingsModal}
                      onPointerDown={triggerLightHaptic}
                      className="flex items-center py-3"
                    >
                      <Settings className="mr-3 h-5 w-5" />{" "}
                      <span className="text-lg">Settings</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

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
                        onPointerDown={triggerLightHaptic}
                      >
                        <Square className="h-5 w-5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        type="submit"
                        disabled={isInvalidConfig || isUploading}
                        aria-label={
                          isUploading ? "Uploading image..." : "Send message"
                        }
                        className="h-10 w-10 p-0 rounded-full border-none ring-1 ring-blue-500/70 shadow-sm shadow-blue-500/50 hover:scale-110 hover:ring-blue-500 hover:shadow-md hover:shadow-blue-500/80 transition-all hover:bg-transparent focus:bg-transparent"
                        onPointerDown={triggerLightHaptic}
                      >
                        <SendHorizonal className="h-5 w-5" />
                      </Button>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {isInvalidConfig
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
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </>
        )}

        {/* Image preview */}
        {images.length > 0 && (
          <div className="absolute bottom-full left-3 mb-3 flex flex-wrap gap-2 max-w-sm">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative bg-background/85 backdrop-blur-md rounded-md 
                shadow-md border border-border overflow-hidden cursor-pointer"
                onClick={() => {
                  const imageUrl =
                    typeof image === "string"
                      ? image
                      : URL.createObjectURL(image)
                  handleImageClick(imageUrl)
                }}
              >
                <img
                  src={
                    typeof image === "string"
                      ? image
                      : URL.createObjectURL(image)
                  }
                  alt={`Preview ${index + 1}`}
                  className="w-12 h-12 object-cover"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-6 w-6 rounded-full bg-background/50 
                  hover:bg-background/80 text-foreground/80"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClearImage(index)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
      </form>

      {/* Session Details Modal */}
      <SessionDetailsModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
      />
    </div>
  )
}
