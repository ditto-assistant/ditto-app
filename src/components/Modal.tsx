import React, {
  useRef,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { DEFAULT_MODAL_STATE, ModalId, useModal } from "../hooks/useModal";

interface ModalProps {
  id: ModalId;
  title: string;
  children: ReactNode;
  fullScreen?: boolean;
}

const MIN_WIDTH = 280;
const MIN_HEIGHT = 200;

export default function Modal({
  id,
  title,
  children,
  fullScreen = false,
}: ModalProps) {
  const { createCloseHandler, getModalState } = useModal();
  const modalRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 400, height: 300 });
  const [isFullscreen, setIsFullscreen] = useState(fullScreen);
  const [localTransform, setLocalTransform] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [resizeEdge, setResizeEdge] = useState<string | null>(null);
  const [zIndex, setZIndex] = useState(1);
  const closeModal = createCloseHandler(id);
  const { isOpen } = getModalState(id) ?? DEFAULT_MODAL_STATE;

  const bringToFront = useCallback(() => {
    setZIndex(Date.now());
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };

    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      return () => window.removeEventListener("keydown", handleEsc);
    }
  }, [isOpen, closeModal]);

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
    edge: string
  ) => {
    setIsResizing(true);
    setResizeEdge(edge);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setResizeStart({ x: clientX, y: clientY });
    bringToFront();
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const getBoundedPosition = (
      x: number,
      y: number,
      width: number,
      height: number
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
        // Update the final position in local state
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
          size.height
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
            boundedSize.height
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

  if (!isOpen) return null;

  const modalStyle = isFullscreen
    ? {
        position: "fixed" as const,
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        zIndex,
      }
    : {
        position: "fixed" as const,
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex,
        transform: `translate(${localTransform.x}px, ${localTransform.y}px)`,
      };

  return createPortal(
    <div
      ref={modalRef}
      className="modal-container"
      style={modalStyle}
      onMouseDown={bringToFront}
      onTouchStart={bringToFront}
    >
      <div className="modal-content">
        <div
          className="modal-header"
          onMouseDown={handleStartDrag}
          onTouchStart={handleStartDrag}
        >
          <div className="modal-title">{title}</div>
          <div className="modal-controls">
            <button
              className="modal-control fullscreen"
              onClick={() => setIsFullscreen(!isFullscreen)}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? "❐" : "⤢"}
            </button>
            <button
              className="modal-control close"
              onClick={closeModal}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="modal-body">{children}</div>

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
    document.getElementById("modal-root")!
  );
}
