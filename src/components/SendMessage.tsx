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
  X,
  Square,
  UserCheck,
} from "lucide-react"
import { sendPrompt, cancelPrompt } from "@/control/agent"
import { uploadImage } from "@/api/userContent"
import { cn } from "@/lib/utils"
import { HapticPattern, triggerHaptic } from "@/utils/haptics"
import { DEFAULT_MODELS, FREE_MODEL_ID } from "@/constants"
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
import { useMemorySyncContext } from "@/contexts/MemorySyncContext"
import { useIOSDetection } from "@/hooks/useIOSDetection"
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
  const [image, setImage] = useState<string | File>(capturedImage || "")
  const [isUploading, setIsUploading] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const preferences = useModelPreferences()
  const { handleImageClick } = useImageViewerHandler()
  const balance = useBalance()
  const { isMobile } = usePlatform()
  const { data: userData } = useUser()
  const iosInfo = useIOSDetection()

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
  const { triggerSync } = useMemorySyncContext()

  const modal = useModal()
  const openTokenModal = modal.createOpenHandler("tokenCheckout")
  const openSubscriptionsTab = modal.createOpenHandler("settings", "general")
  const triggerLightHaptic = () => triggerHaptic(HapticPattern.Light)

  const { user: authUser } = useAuth()
  const user = useUser()

  const [showSalesPitch, setShowSalesPitch] = useState(false)

  const [autoScroll, setAutoScroll] = useState(false)

  useEffect(() => {
    if (balance.data && preferences.preferences) {
      const balanceRaw = balance.data.balanceRaw || 0
      const hasZeroBalance = balanceRaw <= 0
      const currentModelID = preferences.preferences.mainModel
      const selectedModel = DEFAULT_MODELS.find(
        (model) => model.id === currentModelID
      )
      const isInvalid = hasZeroBalance && !selectedModel?.isFree
      setShowSalesPitch(isInvalid)
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

      setIsWaitingForResponse(true)
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
        const firstName = userData?.firstName || ""
        let messageToSend = message
        let imageURI = ""
        let uploadSuccessful = false

        // Handle image upload if present
        if (image) {
          setIsUploading(true)
          try {
            const uploadResult = await uploadImage(userID, image)
            if (uploadResult instanceof Error) {
              throw uploadResult
            }
            console.log(
              `🚀 [SendMessage] Presigned uploaded image: ${uploadResult}`
            )
            imageURI = uploadResult
            messageToSend = `![image](${uploadResult})\n\n${messageToSend}`
            uploadSuccessful = true
          } catch (uploadError) {
            console.error("Error uploading image:", uploadError)
            toast.error("Failed to upload image. Please try again.")
            setIsWaitingForResponse(false)
            setIsUploading(false)
            return
          } finally {
            setIsUploading(false)
          }
        }

        // Only clear state after successful upload (or no image)
        clearPrompt()
        setMessage("")
        if (uploadSuccessful || !image) {
          setImage("")
        }
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
            user?.data?.planTier ?? 0,
            triggerSync
          )
          console.log("✅ [SendMessage] Prompt completed successfully")
        } catch (error) {
          if (error === ErrorPaymentRequired) {
            toast.error("Please upgrade to a paid plan to continue")
            setShowSalesPitch(true)
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
      setIsWaitingForResponse,
      preferences.preferences,
      clearPrompt,
      authUser?.uid,
      setMessage,
      addOptimisticMessage,
      updateOptimisticResponse,
      refetch,
      finalizeOptimisticMessage,
      user?.data?.planTier,
      userData?.firstName,
      onStop,
      triggerSync,
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
      setImage(file)
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
          setImage(blob)
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
    <div
      className="w-full z-[300] bg-background backdrop-blur-md border-t border-border"
      style={{
        paddingBottom:
          iosInfo.isIOS && iosInfo.isPWA
            ? `0px`
            : iosInfo.isIOS
              ? `${iosInfo.safeAreaBottom}px`
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
              {user?.data?.planTier > 0 ? (
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
                onClick={() => {
                  preferences.updatePreferences({ mainModel: FREE_MODEL_ID })
                  setShowSalesPitch(false)
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

              {user?.data?.planTier > 0 && user?.data?.planTier < 3 && (
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
                onClick={() => {
                  openTokenModal()
                }}
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

              {/* Center - Personality Assessments button */}
              <div className="absolute left-1/2 transform -translate-x-1/2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        triggerLightHaptic()
                        modal.createOpenHandler("personalityAssessments")()
                      }}
                      aria-label="View personality assessments"
                      className="h-10 w-10 rounded-full bg-background ring-2 ring-purple-500/70 shadow-lg shadow-purple-500/50 hover:scale-110 hover:ring-purple-500 hover:shadow-xl hover:shadow-purple-500/80 transition-all"
                    >
                      <UserCheck className="h-5 w-5 text-purple-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>My Personality</TooltipContent>
                </Tooltip>
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
                        disabled={showSalesPitch || isUploading}
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
            onClick={() => {
              const imageUrl =
                typeof image === "string" ? image : URL.createObjectURL(image)
              handleImageClick(imageUrl)
            }}
          >
            <img
              src={
                typeof image === "string" ? image : URL.createObjectURL(image)
              }
              alt="Preview"
              className="w-12 h-12 object-cover"
            />
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
      </form>
    </div>
  )
}
