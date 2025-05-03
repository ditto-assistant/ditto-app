import React, { useRef, useState, useEffect, ReactNode } from "react"
import { createPortal } from "react-dom"
import { DEFAULT_MODAL_STATE, ModalId, useModal } from "@/hooks/useModal"
import { useUser } from "@/hooks/useUser"
import { Crown, Maximize2, Minimize2, X } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HapticPattern, triggerHaptic } from "@/utils/haptics"

export interface ModalTab {
  id: string
  label: string
  content: ReactNode
  customClass?: string
  minimumTier?: number
  icon?: ReactNode
  /** Optional custom sales pitch shown on locked tabs */
  salesPitch?: ReactNode
}

interface ModalProps {
  id: ModalId
  title: string
  children?: ReactNode
  fullScreen?: boolean
  tabs?: ModalTab[]
  defaultTabId?: string
  onTabChange?: (tabId: string) => void
  icon?: React.ReactNode
  useGradientTitle?: boolean
  headerLeftContent?: ReactNode
  headerRightContent?: ReactNode
  notResizable?: boolean
}

const MIN_WIDTH = 280
const MIN_HEIGHT = 200

export default function Modal({
  id,
  title,
  children,
  fullScreen = true,
  tabs,
  defaultTabId,
  onTabChange,
  icon,
  useGradientTitle = true,
  headerLeftContent,
  headerRightContent,
  notResizable = false,
}: ModalProps) {
  const {
    createBringToFrontHandler,
    createCloseHandler,
    getModalState,
    createOpenHandler,
  } = useModal()
  const { data: user } = useUser()
  const modalRef = useRef<HTMLDivElement>(null)
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [position, setPosition] = useState({ x: 100, y: 100 })
  const [size, setSize] = useState({ width: 250, height: 400 })
  const [isFullscreen, setIsFullscreen] = useState(fullScreen)
  const [localTransform, setLocalTransform] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 })
  const [resizeEdge, setResizeEdge] = useState<string | null>(null)
  const [activeTabId, setActiveTabId] = useState<string | undefined>(
    defaultTabId || (tabs && tabs.length > 0 ? tabs[0].id : undefined)
  )
  const closeModal = () => {
    triggerHaptic(HapticPattern.Medium)
    createCloseHandler(id)()
  }
  const bringToFront = createBringToFrontHandler(id)
  const modalState = getModalState(id)
  const zIndex = modalState?.zIndex ?? DEFAULT_MODAL_STATE.zIndex

  // Update activeTabId when modal opens with an initialTabId
  useEffect(() => {
    if (modalState?.initialTabId && tabs && tabs.length > 0) {
      // Make sure the tab exists before setting it active
      const tabExists = tabs.some((tab) => tab.id === modalState.initialTabId)
      if (tabExists) {
        setActiveTabId(modalState.initialTabId)
      }
    }
  }, [modalState, tabs])

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    // Skip if target is a control element
    if ((e.target as HTMLElement).closest("[data-modal-control]")) return

    setIsDragging(true)
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    setDragOffset({ x: clientX - position.x, y: clientY - position.y })
    setLocalTransform({ x: 0, y: 0 })
    bringToFront()
  }

  const handleStartResize = (
    e: React.MouseEvent | React.TouchEvent,
    edge: string
  ) => {
    if (notResizable || isFullscreen) return

    setIsResizing(true)
    setResizeEdge(edge)
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    setResizeStart({ x: clientX, y: clientY })
    bringToFront()
    e.stopPropagation()
  }

  // Handle window bounds and dragging/resizing
  useEffect(() => {
    const getBoundedPosition = (
      x: number,
      y: number,
      width: number,
      height: number
    ) => {
      const maxX = window.innerWidth - width
      const maxY = window.innerHeight - height
      return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY)),
      }
    }

    const getBoundedSize = (width: number, height: number) => {
      const maxWidth = window.innerWidth - position.x
      const maxHeight = window.innerHeight - position.y
      return {
        width: Math.max(MIN_WIDTH, Math.min(width, maxWidth)),
        height: Math.max(MIN_HEIGHT, Math.min(height, maxHeight)),
      }
    }

    const handleEnd = () => {
      if (isDragging) {
        const finalPosition = {
          x: position.x + localTransform.x,
          y: position.y + localTransform.y,
        }
        setPosition(finalPosition)
        setLocalTransform({ x: 0, y: 0 })
      }
      setIsDragging(false)
      setIsResizing(false)
      setResizeEdge(null)
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

      if (isDragging) {
        const newX = clientX - dragOffset.x
        const newY = clientY - dragOffset.y
        const boundedPos = getBoundedPosition(
          newX,
          newY,
          size.width,
          size.height
        )
        setLocalTransform({
          x: boundedPos.x - position.x,
          y: boundedPos.y - position.y,
        })
      }

      if (isResizing && resizeEdge) {
        let newWidth = size.width
        let newHeight = size.height
        let newX = position.x
        let newY = position.y

        const dx = clientX - resizeStart.x
        const dy = clientY - resizeStart.y

        if (resizeEdge.includes("e")) newWidth = size.width + dx
        if (resizeEdge.includes("s")) newHeight = size.height + dy
        if (resizeEdge.includes("w")) {
          newWidth = size.width - dx
          newX = position.x + dx
        }
        if (resizeEdge.includes("n")) {
          newHeight = size.height - dy
          newY = position.y + dy
        }

        const boundedSize = getBoundedSize(newWidth, newHeight)
        setSize(boundedSize)

        if (resizeEdge.includes("w") || resizeEdge.includes("n")) {
          const boundedPos = getBoundedPosition(
            newX,
            newY,
            boundedSize.width,
            boundedSize.height
          )
          setPosition(boundedPos)
        }

        setResizeStart({ x: clientX, y: clientY })
      }
    }

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMove)
      window.addEventListener("mouseup", handleEnd)
      window.addEventListener("touchmove", handleMove)
      window.addEventListener("touchend", handleEnd)

      return () => {
        window.removeEventListener("mousemove", handleMove)
        window.removeEventListener("mouseup", handleEnd)
        window.removeEventListener("touchmove", handleMove)
        window.removeEventListener("touchend", handleEnd)
      }
    }
  }, [
    isDragging,
    isResizing,
    dragOffset,
    position,
    resizeEdge,
    resizeStart,
    size,
    localTransform,
  ])

  // Close modal on Escape key press
  useEffect(() => {
    if (!modalState) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [modalState, closeModal])

  // Focus the active tab content container to capture key events
  useEffect(() => {
    if (!modalState || !tabsContainerRef.current) return
    const activeTab =
      tabsContainerRef.current.querySelector(`[data-state=active]`)
    if (activeTab instanceof HTMLElement) {
      activeTab.focus()
    }
  }, [modalState, activeTabId])

  const handleTabChange = (tabId: string) => {
    triggerHaptic(HapticPattern.Light)
    setActiveTabId(tabId)
    if (onTabChange) {
      onTabChange(tabId)
    }
  }

  const isTabLocked = (minimumTier?: number) => {
    if (!minimumTier) return false
    const userTier = user?.planTier || 0
    return userTier < minimumTier
  }

  if (!modalState) return null

  const modalStyle = isFullscreen
    ? {
        zIndex,
        width: "100%",
        height: "100%",
        position: "fixed" as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }
    : {
        zIndex,
        position: "fixed" as const,
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        transform: `translate(${localTransform.x}px, ${localTransform.y}px)`,
      }

  return createPortal(
    <div
      ref={modalRef}
      className={cn(
        "bg-background border shadow-lg flex flex-col rounded-lg overflow-hidden",
        isFullscreen ? "fullscreen" : "",
        id
      )}
      style={modalStyle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          closeModal()
        } else {
          bringToFront()
        }
      }}
      onTouchStart={(e) => {
        const target = e.target as HTMLElement
        const isInteractive =
          target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.tagName === "INPUT" ||
          target.closest("button") ||
          target.closest("a") ||
          target.closest("input")

        if (!isInteractive) {
          bringToFront()
        }
      }}
    >
      {/* Modal Header */}
      <div
        className="border-b flex items-center justify-between py-4 px-4 select-none"
        onMouseDown={handleStartDrag}
        onTouchStart={handleStartDrag}
      >
        <div className="flex items-center gap-3 min-w-0 overflow-hidden">
          {headerLeftContent}
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <h2
            className={cn(
              "text-lg font-medium truncate",
              useGradientTitle && "gradient-title font-semibold"
            )}
          >
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2" data-modal-control>
          {headerRightContent}
          {!notResizable && (
            <button
              onClick={() => {
                triggerHaptic(HapticPattern.Light)
                setIsFullscreen((prev) => !prev)
              }}
              className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
          <button
            onClick={closeModal}
            className="text-muted-foreground hover:text-foreground p-2 rounded-md hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Modal Content with Tabs */}
      {tabs && tabs.length > 0 ? (
        <Tabs
          value={activeTabId}
          onValueChange={handleTabChange}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="overflow-x-auto scrollbar-thin">
            <TabsList
              className="h-12 w-max min-w-full bg-transparent justify-start px-2 rounded-none border-b border-border flex-nowrap"
              ref={tabsContainerRef}
            >
              {tabs.map((tab) => {
                const locked = isTabLocked(tab.minimumTier)
                // Determine upgrade tier name
                const tier = tab.minimumTier || 0
                const tierName =
                  tier >= 3 ? "Hero" : tier >= 2 ? "Strong" : "Spark"
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                      "data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 h-full data-[state=active]:shadow-none",
                      tab.customClass === "danger" && "text-destructive",
                      locked && "premium-tab relative"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {tab.icon && (
                        <span className="flex-shrink-0">{tab.icon}</span>
                      )}
                      <span>{tab.label}</span>
                      {locked && (
                        <div className="flex items-center gap-1 bg-primary text-primary-foreground rounded px-1.5 py-0.5 text-xs font-medium ml-1">
                          <Crown className="h-3 w-3" />
                          <span>PRO</span>
                        </div>
                      )}
                    </div>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </div>

          {tabs.map((tab) => {
            const locked = isTabLocked(tab.minimumTier)
            // Determine upgrade tier name for overlay button
            const tier = tab.minimumTier || 0
            const tierName = tier >= 3 ? "Hero" : tier >= 2 ? "Strong" : "Spark"
            return (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="flex-1 h-full overflow-auto p-0 focus-visible:outline-none data-[state=active]:flex flex-col relative"
              >
                {locked ? (
                  <div className="h-full w-full flex flex-col">
                    {/* Dimmed content underneath */}
                    <div className="flex-1 opacity-30 pointer-events-none overflow-hidden">
                      {tab.content}
                    </div>
                    {/* Overlay with upgrade prompt */}
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/60">
                      <div className="text-center p-8 space-y-4 max-w-lg">
                        <Crown className="h-12 w-12 mx-auto text-primary" />
                        <h3 className="text-2xl font-bold">Premium Feature</h3>
                        {/* Custom sales pitch if provided */}
                        {tab.salesPitch ? (
                          <div className="text-lg text-muted-foreground">
                            {tab.salesPitch}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">
                            Unlock {tab.label} and other premium features by
                            upgrading your plan.
                          </p>
                        )}
                        <Button
                          variant="default"
                          className="mt-4"
                          onClick={() => createOpenHandler(id, "general")()}
                        >
                          Upgrade to {tierName}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  tab.content
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      ) : (
        <div className="flex-1 overflow-auto p-0 min-h-0">{children}</div>
      )}

      {/* Resize Handles - only shown when not fullscreen and not marked as notResizable */}
      {!isFullscreen && !notResizable && (
        <>
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 cursor-n-resize"
            onMouseDown={(e) => handleStartResize(e, "n")}
            onTouchStart={(e) => handleStartResize(e, "n")}
          />
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-full cursor-e-resize"
            onMouseDown={(e) => handleStartResize(e, "e")}
            onTouchStart={(e) => handleStartResize(e, "e")}
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1 cursor-s-resize"
            onMouseDown={(e) => handleStartResize(e, "s")}
            onTouchStart={(e) => handleStartResize(e, "s")}
          />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-full cursor-w-resize"
            onMouseDown={(e) => handleStartResize(e, "w")}
            onTouchStart={(e) => handleStartResize(e, "w")}
          />

          {/* Corner resize handles */}
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize"
            onMouseDown={(e) => handleStartResize(e, "nw")}
            onTouchStart={(e) => handleStartResize(e, "nw")}
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize"
            onMouseDown={(e) => handleStartResize(e, "ne")}
            onTouchStart={(e) => handleStartResize(e, "ne")}
          />
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
            onMouseDown={(e) => handleStartResize(e, "se")}
            onTouchStart={(e) => handleStartResize(e, "se")}
          />
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize"
            onMouseDown={(e) => handleStartResize(e, "sw")}
            onTouchStart={(e) => handleStartResize(e, "sw")}
          />
        </>
      )}
    </div>,
    document.getElementById("modal-root")!
  )
}
