import { useState, useEffect, useRef, useCallback } from "react"
import {
  Plus,
  Image,
  Camera,
  LucidePlane,
  Expand,
  Play,
  Pen,
  Code,
  CreditCard,
  Crown,
  Bolt,
  Laptop,
  Settings,
  MessageCircle,
  X,
} from "lucide-react"
import { sendPrompt } from "../control/agent"
import { auth, uploadImageToFirebaseStorageBucket } from "../control/firebase"
import { motion, AnimatePresence } from "framer-motion"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler"
import { useBalance } from "@/hooks/useBalance"
import { usePlatform } from "@/hooks/usePlatform"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import { usePromptStorage } from "@/hooks/usePromptStorage"
import { useScripts } from "@/hooks/useScripts.tsx"
import { useModal } from "@/hooks/useModal"
import SlidingMenu from "@/components/ui/SlidingMenu"
import { DITTO_AVATAR, DEFAULT_MODELS, FREE_MODEL_ID } from "@/constants"
import { toast } from "sonner"
import { useUser } from "@/hooks/useUser"
import { ErrorPaymentRequired } from "@/types/errors"
import { Button } from "@/components/ui/button"
import ButtonRow from "@/components/ui/ButtonRow"
import { useComposeContext } from "@/contexts/ComposeContext"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
/**
 * A component that allows the user to send a message to the agent
 * @param {Object} props - The component props
 * @param {function(): void} props.onCameraOpen - A function that opens the camera
 * @param {string} props.capturedImage - The URL of the captured image
 * @param {function(): void} props.onClearCapturedImage - A function that clears the captured image
 * @param {function(): void} props.onStop - A function that handles the stop event
 */
export default function SendMessage({
  onCameraOpen,
  capturedImage,
  onClearCapturedImage,
  onStop,
}) {
  const [image, setImage] = useState(capturedImage || "")
  const textAreaRef = useRef(null)
  const preferences = useModelPreferences()
  const { openImageViewer } = useImageViewerHandler()
  const balance = useBalance()
  const { isMobile } = usePlatform()
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
  } = useComposeContext()
  const { clearPrompt } = usePromptStorage()
  const canvasRef = useRef()

  // Ditto logo button state and refs
  const logoButtonRef = useRef(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const modal = useModal()
  const openSettingsModal = modal.createOpenHandler("settings")
  const openSubscriptionsTab = modal.createOpenHandler("settings", "general")
  const openFeedbackModal = modal.createOpenHandler("feedback")
  const openScriptsOverlay = modal.createOpenHandler("scripts")
  const openTokenModal = modal.createOpenHandler("tokenCheckout")

  // Script indicator state and refs
  const scriptIndicatorRef = useRef(null)
  const [showScriptActions, setShowScriptActions] = useState(false)
  const openDittoCanvas = modal.createOpenHandler("dittoCanvas")
  const { selectedScript, setSelectedScript, handleDeselectScript } =
    useScripts()
  const user = useUser()

  const [showSalesPitch, setShowSalesPitch] = useState(false)

  // Track if we're in an invalid configuration (zero balance with paid model)
  const [isInvalidConfig, setIsInvalidConfig] = useState(false)

  useEffect(() => {
    if (balance.data && preferences.preferences) {
      const balanceRaw = balance.data.balanceRaw || 0
      const hasZeroBalance = balanceRaw <= 0
      const currentModelID = preferences.preferences.mainModel
      const selectedModel = DEFAULT_MODELS.find(
        (model) => model.id === currentModelID
      )
      const selectedModelHasTier = selectedModel?.minimumTier > 0

      const isInvalid = hasZeroBalance && selectedModelHasTier
      setShowSalesPitch(isInvalid)
      setIsInvalidConfig(isInvalid)
    }
  }, [balance.data, preferences.preferences])

  const handleSubmit = useCallback(
    async (event) => {
      if (event) event.preventDefault()
      if (isWaitingForResponse) return
      if (message === "" && !image) return

      if (isMenuOpen) {
        setIsMenuOpen(false)
        setMenuPinned(false)
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
        const timestamp = Date.now().toString()
        const optimisticId = `msg_${timestamp}_${Math.random().toString(36).substring(2, 9)}`
        const optimisticMessageId = addOptimisticMessage(
          messageToSend,
          imageURI,
          optimisticId
        )
        const streamingCallback = (chunk) => {
          updateOptimisticResponse(optimisticMessageId, chunk)
        }
        const openScriptCallback = (script) => {
          setSelectedScript(script)
          openDittoCanvas()
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
            openScriptCallback,
            selectedScript,
            user?.data?.planTier
          )
          console.log("✅ [SendMessage] Prompt completed successfully")
        } catch (error) {
          if (error === ErrorPaymentRequired) {
            toast.error("Please upgrade to a paid plan to continue")
            setShowSalesPitch(true)
            setIsInvalidConfig(true)
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
      setSelectedScript,
      openDittoCanvas,
      refetch,
      finalizeOptimisticMessage,
      selectedScript,
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

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleClearImage = () => {
    setImage("")
    onClearCapturedImage()
  }

  const handleKeyDown = (e) => {
    if (isMobile) {
      if (e.key === "Enter") {
        e.preventDefault()
        setMessage((prevMessage) => prevMessage + "\n")
      }
    } else {
      if (e.key === "Enter") {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
          setMessage((prevMessage) => prevMessage + "\n")
        } else if (e.shiftKey) {
          // Allow shift+enter for newlines
        } else {
          e.preventDefault()
          handleSubmit()
        }
      }
    }
  }

  const handlePaste = (event) => {
    const items = event.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile()
        const reader = new FileReader()
        reader.onload = () => {
          setImage(reader.result)
        }
        reader.readAsDataURL(blob)
        event.preventDefault()
        break
      }
    }
  }

  const handleGalleryClick = (e) => {
    document.getElementById("image-upload").click()
  }

  const handleCameraClick = (e) => {
    onCameraOpen()
  }

  // Ditto logo button handlers
  const handleHoverStart = () => {
    // No hover behavior - we only use click/tap to toggle the menu
  }

  const handleHoverEnd = () => {
    // No hover behavior - we only use click/tap to toggle the menu
  }

  const handleLogoClick = () => {
    // Simple toggle behavior for all platforms
    setIsMenuOpen(!isMenuOpen)
  }

  // Script indicator handlers
  const handleScriptNameClick = () => {
    setShowScriptActions(!showScriptActions)
  }

  const handlePlayScript = () => {
    if (selectedScript) {
      openDittoCanvas()
    }
  }

  // Handle accessibility keyboard events for buttons
  const handleButtonKeyDown = (event, callback) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      callback()
    }
  }

  // Add auto-resize function
  const autoResizeTextarea = useCallback(() => {
    if (textAreaRef.current) {
      // Store current scroll position
      const scrollTop = textAreaRef.current.scrollTop

      // Reset height temporarily to get the correct scrollHeight
      textAreaRef.current.style.height = "auto"

      // Calculate the new height (capped at 200px)
      const scrollHeight = textAreaRef.current.scrollHeight
      const maxHeight = 200
      const newHeight = Math.min(scrollHeight, maxHeight)

      // Set the height
      textAreaRef.current.style.height = `${newHeight}px`

      // Restore scroll position
      textAreaRef.current.scrollTop = scrollTop
    }
  }, [])

  // Auto-resize when message changes
  useEffect(() => {
    autoResizeTextarea()
  }, [message, autoResizeTextarea])

  return (
    <>
      <form className="form" onSubmit={handleSubmit} onPaste={handlePaste}>
        {showSalesPitch ? (
          <div className="sales-pitch-content-container">
            <div className="sales-pitch-header">
              <div className="sales-pitch-title">Out of Ditto Tokens</div>
              <button
                className="sales-pitch-close"
                onClick={() => {
                  setShowSalesPitch(false)
                }}
                aria-label="Close sales pitch"
              >
                <X />
              </button>
            </div>
            <div className="sales-pitch-content">
              Subscribe or buy tokens to keep using{" "}
              <span className="sales-pitch model-name">
                {preferences.preferences.mainModel}
              </span>
            </div>
            <div className="sales-pitch-options">
              <button
                className="sales-pitch-option free-model-option"
                onClick={() => {
                  preferences.updatePreferences({ mainModel: FREE_MODEL_ID })
                  setShowSalesPitch(false)
                  setIsInvalidConfig(false)
                  toast.success("Switched to a free model")
                }}
              >
                <Bolt /> Switch to Free Model
              </button>

              {!user?.data?.subscription && (
                <button
                  className="sales-pitch-option subscribe-option"
                  onClick={openSubscriptionsTab}
                >
                  <Crown /> Subscribe to a Plan
                </button>
              )}

              <button
                className="sales-pitch-option token-option"
                onClick={() => {
                  if (user?.data?.subscription) {
                    openSubscriptionsTab()
                  } else {
                    openTokenModal()
                  }
                }}
              >
                <CreditCard />{" "}
                {user?.data?.subscription ? "Upgrade Plan" : "Buy Tokens"}
              </button>
            </div>
          </div>
        ) : (
          // Regular send message UI
          <>
            <div className="input-wrapper">
              <Textarea
                ref={textAreaRef}
                onKeyDown={handleKeyDown}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message Ditto"
                className={cn(
                  "text-area",
                  "resize-none",
                  message.length > 0 && "has-content"
                )}
              />
            </div>

            <div className="bottom-buttons-bar">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {/* Full screen button on the left using shadcn/ui */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      openComposeModal()
                    }}
                    aria-label="Expand message"
                    className="h-9 w-9"
                  >
                    <Expand className="h-5 w-5" />
                  </Button>

                  {/* Add Media dropdown menu using shadcn/ui */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Add media"
                        className="h-9 w-9"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={handleGalleryClick}>
                        <Image className="mr-2 h-4 w-4" />
                        <span>Photo Gallery</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCameraClick}>
                        <Camera className="mr-2 h-4 w-4" />
                        <span>Camera</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Center Ditto logo button */}
                <div className="ditto-button-container">
                  <motion.div
                    ref={logoButtonRef}
                    className="h-9 w-9 rounded-full flex items-center justify-center cursor-pointer"
                    whileTap={{ scale: 0.9 }}
                    whileHover={{
                      scale: 1.1,
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
                    }}
                    onClick={handleLogoClick}
                    onKeyDown={(e) => handleButtonKeyDown(e, handleLogoClick)}
                    aria-label="Menu"
                    role="button"
                    tabIndex={0}
                  >
                    <img
                      src={DITTO_AVATAR}
                      alt="Ditto"
                      className="h-7 w-7 rounded-full"
                    />
                  </motion.div>

                  {/* Hidden sliding menu container for Ditto logo */}
                  <div className="ditto-menu-container">
                    <SlidingMenu
                      isOpen={isMenuOpen}
                      onClose={() => {
                        setIsMenuOpen(false)
                      }}
                      position="center"
                      triggerRef={logoButtonRef}
                      menuPosition="bottom"
                      menuTitle="Options"
                      menuItems={[
                        {
                          icon: <Laptop className="icon" />,
                          text: "Scripts",
                          onClick: openScriptsOverlay,
                        },
                        {
                          icon: <MessageCircle className="icon" />,
                          text: "Feedback",
                          onClick: openFeedbackModal,
                        },
                        {
                          icon: <Settings className="icon" />,
                          text: "Settings",
                          onClick: openSettingsModal,
                        },
                      ]}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Script indicator button using shadcn/ui */}
                  {selectedScript && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleScriptNameClick}
                      ref={scriptIndicatorRef}
                      title={selectedScript.script}
                      className="h-9 w-9"
                    >
                      <Code className="h-5 w-5" />
                    </Button>
                  )}

                  {/* Send button on the right using shadcn/ui */}
                  <Button
                    variant="default"
                    size="icon"
                    type="submit"
                    disabled={isWaitingForResponse || isInvalidConfig}
                    aria-label="Send message"
                    title={
                      isInvalidConfig
                        ? "You need tokens to use this model. Please select a free model or add tokens."
                        : ""
                    }
                    className="h-9 w-9"
                  >
                    <LucidePlane className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <input
                id="image-upload"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageUpload}
              />
            </div>
          </>
        )}

        {image && (
          <div className="image-preview" onClick={() => openImageViewer(image)}>
            <img src={image} alt="Preview" />
            <X
              className="remove-image"
              onClick={(e) => {
                e.stopPropagation()
                handleClearImage()
              }}
            />
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }}></canvas>
      </form>
    </>
  )
}
