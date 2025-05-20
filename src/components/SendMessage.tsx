import { useState, useEffect, useRef, useCallback } from "react"
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
} from "lucide-react"
import { sendPrompt, cancelPrompt } from "../control/agent"
import { auth, uploadImageToFirebaseStorageBucket } from "../control/firebase"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler"
import { useBalance } from "@/hooks/useBalance"
import { usePlatform } from "@/hooks/usePlatform"
import { useVisualViewport } from "@/hooks/useVisualViewport"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import { usePromptStorage } from "@/hooks/usePromptStorage"
import { useModal } from "@/hooks/useModal"
import { DITTO_LOGO, DEFAULT_MODELS, FREE_MODEL_ID } from "@/constants"
import { toast } from "sonner"
import { useUser } from "@/hooks/useUser"
import { ErrorPaymentRequired } from "@/types/errors"
import { useComposeContext } from "@/contexts/ComposeContext"
import { cn } from "@/lib/utils"
import { HapticPattern, triggerHaptic } from "@/utils/haptics"

// UI components
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
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
  const [image, setImage] = useState<string>(capturedImage || "")
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const preferences = useModelPreferences()
  const { handleImageClick } = useImageViewerHandler()
  const balance = useBalance()
  const { isMobile, isAndroid } = usePlatform()
  const viewport = useVisualViewport()
  const {
    refetch,
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

  // Ditto logo button state and refs
  const logoButtonRef = useRef<HTMLDivElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const modal = useModal()
  const openSettingsModal = modal.createOpenHandler("settings")
  const openSubscriptionsTab = modal.createOpenHandler("settings", "general")
  const openFeedbackModal = modal.createOpenHandler("feedback")
  const openMemoriesOverlay = modal.createOpenHandler("memories")
  const openTokenModal = modal.createOpenHandler("tokenCheckout")
  const triggerLightHaptic = () => triggerHaptic(HapticPattern.Light)

  const user = useUser()

  const [showSalesPitch, setShowSalesPitch] = useState(false)

  // Track if we're in an invalid configuration (zero balance with paid model)
  const [isInvalidConfig, setIsInvalidConfig] = useState(false)

  const [autoScroll, setAutoScroll] = useState(false)

  // Track focus on textarea so we can temporarily disable ChatFeed scrolling
  const [isTextareaFocused, setIsTextareaFocused] = useState(false)

  // Helper to toggle the .no-scroll class on ChatFeed scroll container
  useEffect(() => {
    const chatScroll = document.querySelector(
      ".messages-scroll-view"
    ) as HTMLElement | null
    if (!chatScroll) return

    if (isTextareaFocused && autoScroll) {
      // Only add no-scroll to the chat feed, don't modify body overflow
      chatScroll.classList.add("no-scroll")
    } else {
      chatScroll.classList.remove("no-scroll")
    }

    return () => {
      // Cleanup on dependency change or unmount
      chatScroll?.classList.remove("no-scroll")
    }
  }, [isTextareaFocused, autoScroll])

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
    if (isWaitingForResponse) {
      console.log("🛑 [SendMessage] Stopping response generation")
      const wasCancelled = cancelPrompt()
      if (wasCancelled) {
        toast.info("Response generation stopped")
      }
      setIsWaitingForResponse(false)
      onStop()
    }
  }, [isWaitingForResponse, onStop, setIsWaitingForResponse])

  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      if (event) event.preventDefault()
      if (isWaitingForResponse) return
      if (message === "" && !image) return

      if (isMenuOpen) {
        setIsMenuOpen(false)
      }

      setIsWaitingForResponse(true)
      try {
        const userID = auth.currentUser?.uid
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
        const firstName = localStorage.getItem("firstName") || ""
        let messageToSend = message
        let imageURI = ""
        if (image) {
          try {
            imageURI = await uploadImageToFirebaseStorageBucket(image, userID)
            messageToSend = `![image](${imageURI})\n\n${messageToSend}`
          } catch (uploadError) {
            console.error("Error uploading image:", uploadError)
            toast.error("Failed to upload image")
          }
        }
        clearPrompt()
        setMessage("")
        setImage("")
        console.log("🚀 [SendMessage] Creating optimistic message")
        const optimisticMessageId = addOptimisticMessage(
          messageToSend,
          imageURI
        )
        const streamingCallback = (chunk: string) => {
          updateOptimisticResponse(optimisticMessageId, chunk)
        }

        try {
          await sendPrompt(
            userID,
            firstName,
            messageToSend,
            imageURI,
            preferences.preferences,
            refetch,
            streamingCallback,
            optimisticMessageId,
            finalizeOptimisticMessage,
            null,
            null,
            user?.data?.planTier ?? 0
          )
          console.log("✅ [SendMessage] Prompt completed successfully")
        } catch (error) {
          if (error === ErrorPaymentRequired) {
            toast.error("Please upgrade to a paid plan to continue")
            setShowSalesPitch(true)
            setIsInvalidConfig(true)
          } else if (
            error instanceof Error &&
            error.message === "Request cancelled"
          ) {
            console.log("⏹️ [SendMessage] Prompt was cancelled by user")
          } else {
            console.error("❌ [SendMessage] Error in sendPrompt:", error)
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
        onStop()
      }
    },
    [
      isWaitingForResponse,
      message,
      image,
      isMenuOpen,
      setIsWaitingForResponse,
      preferences.preferences,
      clearPrompt,
      setMessage,
      addOptimisticMessage,
      updateOptimisticResponse,
      refetch,
      finalizeOptimisticMessage,
      user?.data?.planTier,
      onStop,
    ]
  )

  useEffect(() => {
    registerSubmitCallback(() => handleSubmit())
  }, [registerSubmitCallback, handleSubmit])

  useEffect(() => {
    if (capturedImage) {
      setImage(capturedImage)
    }
  }, [capturedImage])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) {
          setImage(e.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleClearImage = () => {
    setImage("")
    onClearCapturedImage()
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
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile()
        if (blob) {
          const reader = new FileReader()
          reader.onload = () => {
            if (reader.result) {
              setImage(reader.result as string)
            }
          }
          reader.readAsDataURL(blob)
          event.preventDefault()
          break
        }
      }
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

    // Update body class when keyboard is visible on Android
    if (isAndroid && viewport.keyboardVisible) {
      document.body.classList.add("keyboard-visible")
    } else {
      document.body.classList.remove("keyboard-visible")
    }
  }, [isAndroid, viewport.keyboardVisible])

  // Auto-resize when message changes
  useEffect(() => {
    autoResizeTextarea()
  }, [message, autoResizeTextarea])

  return (
    <div className={cn(
      "w-full z-[300] bg-background backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)]",
      isAndroid && viewport.keyboardVisible ? "send-message-container" : ""
    )}>
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
                onFocus={() => setIsTextareaFocused(true)}
                onBlur={() => setIsTextareaFocused(false)}
                onTouchStart={(e) => {
                  if (autoScroll && isAndroid) {
                    // Prevent event from reaching ChatFeed
                    e.stopPropagation();
                  }
                }}
                onTouchMove={(e) => {
                  // On Android with keyboard open, we need to stop propagation
                  // to prevent ChatFeed from scrolling when textarea needs to scroll
                  if (isAndroid && viewport.keyboardVisible && autoScroll) {
                    // Stop propagation but don't prevent default (to keep scrolling)
                    e.stopPropagation();
                    
                    // Block scrolling on other elements when textarea needs to scroll
                    if (e.currentTarget.scrollHeight > e.currentTarget.clientHeight) {
                      const chatScroll = document.querySelector(".messages-scroll-view") as HTMLElement | null;
                      if (chatScroll) {
                        chatScroll.classList.add("no-scroll");
                      }
                    }
                  }
                }}
                placeholder="Message Ditto"
                className={cn(
                  "resize-none w-full px-3 py-2.5 rounded-lg transition-all",
                  "min-h-[64px] max-h-[200px]", // grow from ~4 lines up to 200px
                  autoScroll
                    ? "overflow-y-auto overscroll-y-contain" // toggle scroll
                    : "overflow-y-hidden", // toggle scroll
                  isAndroid ? "touch-auto" : "touch-pan-y", // Different touch behavior for Android
                  isAndroid && autoScroll ? "pointer-events-auto z-[400]" : "", // Ensure Android captures all events
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

              {/* Center Ditto logo dropdown */}
              <div className="absolute left-1/2 -translate-x-1/2">
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
                        disabled={isInvalidConfig}
                        aria-label="Send message"
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
              style={{ display: "none" }}
              onChange={handleImageUpload}
            />
          </>
        )}

        {/* Image preview */}
        {image && (
          <div
            className="absolute bottom-full left-3 mb-3 bg-background/85 backdrop-blur-md rounded-md 
            flex items-center shadow-md border border-border overflow-hidden cursor-pointer"
            onClick={() => handleImageClick(image)}
          >
            <img src={image} alt="Preview" className="w-12 h-12 object-cover" />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-6 w-6 rounded-full bg-background/50 
              hover:bg-background/80 text-foreground/80"
              onClick={(e) => {
                e.stopPropagation()
                handleClearImage()
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
      </form>
    </div>
  )
}
