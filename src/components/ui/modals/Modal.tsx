import React, { useRef, useState, useEffect, ReactNode } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_MODAL_STATE, ModalId, useModal } from "@/hooks/useModal";
import { ModalHeader } from "./ModalHeader";
import { useUser } from "@/hooks/useUser";
import { FaCrown } from "react-icons/fa";

export interface ModalTab {
  id: string;
  label: string;
  content: ReactNode;
  customClass?: string;
  minimumTier?: number;
  icon?: ReactNode;
}

interface ModalProps {
  id: ModalId;
  title: string;
  children?: ReactNode;
  fullScreen?: boolean;
  tabs?: ModalTab[];
  defaultTabId?: string;
  onTabChange?: (tabId: string) => void;
  icon?: React.ReactNode;
  useGradientTitle?: boolean;
}

const MIN_WIDTH = 280;
const MIN_HEIGHT = 200;

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
}: ModalProps) {
  const { createBringToFrontHandler, createCloseHandler, getModalState } =
    useModal();
  const { data: user } = useUser();
  const modalRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 250, height: 400 });
  const [isFullscreen, setIsFullscreen] = useState(fullScreen);
  const [localTransform, setLocalTransform] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [resizeEdge, setResizeEdge] = useState<string | null>(null);
  const [activeTabId, setActiveTabId] = useState<string | undefined>(
    defaultTabId || (tabs && tabs.length > 0 ? tabs[0].id : undefined),
  );
  const closeModal = createCloseHandler(id);
  const bringToFront = createBringToFrontHandler(id);
  const modalState = getModalState(id);
  const zIndex = modalState?.zIndex ?? DEFAULT_MODAL_STATE.zIndex;

  // Update activeTabId when modal opens with an initialTabId
  useEffect(() => {
    if (modalState && modalState.initialTabId && tabs && tabs.length > 0) {
      // Make sure the tab exists before setting it active
      const tabExists = tabs.some((tab) => tab.id === modalState.initialTabId);
      if (tabExists) {
        setActiveTabId(modalState.initialTabId);
      }
    }
  }, [modalState, tabs]);

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest(".modal-controls")) return;

    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setDragOffset({ x: clientX - position.x, y: clientY - position.y });
    setLocalTransform({ x: 0, y: 0 });
    bringToFront();
  };

  const handleStartResize = (
    e: React.MouseEvent | React.TouchEvent,
    edge: string,
  ) => {
    setIsResizing(true);
    setResizeEdge(edge);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setResizeStart({ x: clientX, y: clientY });
    bringToFront();
    e.stopPropagation();
  };

  // Scroll to active tab when it changes
  useEffect(() => {
    if (activeTabRef.current && tabsContainerRef.current) {
      const tabElement = activeTabRef.current;
      const tabsContainer = tabsContainerRef.current;
      const tabRect = tabElement.getBoundingClientRect();
      const containerRect = tabsContainer.getBoundingClientRect();

      // Check if tab is outside visible area
      if (
        tabRect.left < containerRect.left ||
        tabRect.right > containerRect.right
      ) {
        // Calculate scroll position to center the tab
        const scrollPosition =
          tabElement.offsetLeft -
          tabsContainer.clientWidth / 2 +
          tabElement.clientWidth / 2;

        tabsContainer.scrollTo({
          left: Math.max(0, scrollPosition),
          behavior: "smooth",
        });
      }
    }
  }, [activeTabId]);

  useEffect(() => {
    const getBoundedPosition = (
      x: number,
      y: number,
      width: number,
      height: number,
    ) => {
      const maxX = window.innerWidth - width;
      const maxY = window.innerHeight - height;
      return {
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY)),
      };
    };

    const getBoundedSize = (width: number, height: number) => {
      const maxWidth = window.innerWidth - position.x;
      const maxHeight = window.innerHeight - position.y;
      return {
        width: Math.max(MIN_WIDTH, Math.min(width, maxWidth)),
        height: Math.max(MIN_HEIGHT, Math.min(height, maxHeight)),
      };
    };

    const handleEnd = () => {
      if (isDragging) {
        const finalPosition = {
          x: position.x + localTransform.x,
          y: position.y + localTransform.y,
        };
        setPosition(finalPosition);
        setLocalTransform({ x: 0, y: 0 });
      }
      setIsDragging(false);
      setIsResizing(false);
      setResizeEdge(null);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (isDragging) {
        const newX = clientX - dragOffset.x;
        const newY = clientY - dragOffset.y;
        const boundedPos = getBoundedPosition(
          newX,
          newY,
          size.width,
          size.height,
        );
        setLocalTransform({
          x: boundedPos.x - position.x,
          y: boundedPos.y - position.y,
        });
      }

      if (isResizing && resizeEdge) {
        let newWidth = size.width;
        let newHeight = size.height;
        let newX = position.x;
        let newY = position.y;

        const dx = clientX - resizeStart.x;
        const dy = clientY - resizeStart.y;

        if (resizeEdge.includes("e")) newWidth = size.width + dx;
        if (resizeEdge.includes("s")) newHeight = size.height + dy;
        if (resizeEdge.includes("w")) {
          newWidth = size.width - dx;
          newX = position.x + dx;
        }
        if (resizeEdge.includes("n")) {
          newHeight = size.height - dy;
          newY = position.y + dy;
        }

        const boundedSize = getBoundedSize(newWidth, newHeight);
        setSize(boundedSize);

        if (resizeEdge.includes("w") || resizeEdge.includes("n")) {
          const boundedPos = getBoundedPosition(
            newX,
            newY,
            boundedSize.width,
            boundedSize.height,
          );
          setPosition(boundedPos);
        }

        setResizeStart({ x: clientX, y: clientY });
      }
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleEnd);
      window.addEventListener("touchmove", handleMove);
      window.addEventListener("touchend", handleEnd);

      return () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleEnd);
        window.removeEventListener("touchmove", handleMove);
        window.removeEventListener("touchend", handleEnd);
      };
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
  ]);

  const isTabLocked = (minimumTier?: number) => {
    if (!minimumTier) return false;
    const userTier = user?.planTier || 0;
    return userTier < minimumTier;
  };

  const handleTabClick = (tab: ModalTab) => {
    setActiveTabId(tab.id);
    if (onTabChange) {
      onTabChange(tab.id);
    }
  };

  if (!modalState) return null;

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
      };

  return createPortal(
    <div
      ref={modalRef}
      className={`modal container ${isFullscreen ? "fullscreen" : ""} ${id}`}
      style={modalStyle}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        } else {
          bringToFront();
        }
      }}
      onTouchStart={(e) => {
        const target = e.target as HTMLElement;
        const isInteractive =
          target.tagName === "BUTTON" ||
          target.tagName === "A" ||
          target.tagName === "INPUT" ||
          target.closest("button") ||
          target.closest("a") ||
          target.closest("input");

        if (!isInteractive) {
          bringToFront();
        }
      }}
    >
      <div className="modal content">
        <div
          onMouseDown={handleStartDrag}
          onTouchStart={(e) => {
            handleStartDrag(e);
          }}
        >
          <ModalHeader
            title={title}
            onClose={closeModal}
            className={isFullscreen ? "fullscreen" : ""}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
            icon={icon}
            useGradient={useGradientTitle}
          />
        </div>

        {tabs && tabs.length > 0 && (
          <div className="modal-tabs" ref={tabsContainerRef}>
            {tabs.map((tab) => {
              const locked = isTabLocked(tab.minimumTier);
              return (
                <button
                  key={tab.id}
                  ref={tab.id === activeTabId ? activeTabRef : null}
                  className={`modal-tab ${
                    tab.id === activeTabId ? "active" : ""
                  } ${tab.customClass || ""} ${locked ? "premium" : ""}`}
                  onClick={() => handleTabClick(tab)}
                  data-tab-id={tab.id}
                >
                  {tab.icon && <span className="tab-icon">{tab.icon}</span>}
                  <span>{tab.label}</span>
                  {locked && (
                    <div className="premium-badge">
                      <FaCrown className="crown-icon" />
                      <span>PRO</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="modal-wrapper">
          <div className={`modal body ${id}-body`}>
            {tabs && tabs.length > 0
              ? (() => {
                  const activeTab = tabs.find((tab) => tab.id === activeTabId);
                  return activeTab && activeTab.content
                    ? activeTab.content
                    : null;
                })()
              : null}

            {/* Always render children - visibility controlled by CSS */}
            {children}
          </div>

          {tabs && tabs.length > 0 && false && (
            <div className="modal-footer">{children}</div>
          )}
        </div>

        {!isFullscreen && (
          <>
            <div
              className="resize-handle n"
              onMouseDown={(e) => handleStartResize(e, "n")}
              onTouchStart={(e) => handleStartResize(e, "n")}
            />
            <div
              className="resize-handle e"
              onMouseDown={(e) => handleStartResize(e, "e")}
              onTouchStart={(e) => handleStartResize(e, "e")}
            />
            <div
              className="resize-handle s"
              onMouseDown={(e) => handleStartResize(e, "s")}
              onTouchStart={(e) => handleStartResize(e, "s")}
            />
            <div
              className="resize-handle w"
              onMouseDown={(e) => handleStartResize(e, "w")}
              onTouchStart={(e) => handleStartResize(e, "w")}
            />
            <div
              className="resize-handle nw"
              onMouseDown={(e) => handleStartResize(e, "nw")}
              onTouchStart={(e) => handleStartResize(e, "nw")}
            />
            <div
              className="resize-handle ne"
              onMouseDown={(e) => handleStartResize(e, "ne")}
              onTouchStart={(e) => handleStartResize(e, "ne")}
            />
            <div
              className="resize-handle se"
              onMouseDown={(e) => handleStartResize(e, "se")}
              onTouchStart={(e) => handleStartResize(e, "se")}
            />
            <div
              className="resize-handle sw"
              onMouseDown={(e) => handleStartResize(e, "sw")}
              onTouchStart={(e) => handleStartResize(e, "sw")}
            />
          </>
        )}
      </div>
    </div>,
    document.getElementById("modal-root")!,
  );
}
