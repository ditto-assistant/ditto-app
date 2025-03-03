import { motion, AnimatePresence } from "framer-motion";
import MarkdownRenderer from "./MarkdownRenderer";
import { DEFAULT_USER_AVATAR, DITTO_AVATAR } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { FiCopy } from "react-icons/fi";
import { FaBrain, FaTrash } from "react-icons/fa";
import { usePlatform } from "@/hooks/usePlatform";
import "./ChatMessage.css";

const detectToolType = (text: string) => {
  if (!text) return null;
  if (text.includes("Image Task:") || text.includes("<IMAGE_GENERATION>"))
    return "image";
  if (text.includes("Google Search Query:") || text.includes("<GOOGLE_SEARCH>"))
    return "search";
  if (
    text.includes("OpenSCAD Script Generated") ||
    text.includes("<OPENSCAD_SCRIPT>")
  )
    return "openscad";
  if (text.includes("HTML Script Generated") || text.includes("<HTML_SCRIPT>"))
    return "html";
  if (text.includes("Home Assistant Task:")) return "home";

  return null;
};

// Tool label colors and texts
const toolLabels: Record<string, { color: string; text: string }> = {
  openscad: { color: "#1E88E5", text: "OpenSCAD" },
  html: { color: "#FF9800", text: "HTML" },
  image: { color: "#4CAF50", text: "Image" },
  search: { color: "#9C27B0", text: "Search" },
  home: { color: "#F44336", text: "Home" },
};

// Avatar action menu component
const AvatarActionMenu = ({
  isUser,
  onCopy,
  onDelete,
  onShowMemories,
}: {
  isUser: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onShowMemories: () => void;
}) => {
  const direction = isUser ? "right" : "left";

  return (
    <motion.div
      className={`avatar-action-menu ${direction}`}
      initial={{ opacity: 0, x: isUser ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isUser ? -20 : 20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <button
        className="action-icon-button"
        onClick={onCopy}
        aria-label="Copy message"
      >
        <FiCopy />
      </button>
      <button
        className="action-icon-button"
        onClick={onShowMemories}
        aria-label="Show memories"
      >
        <FaBrain />
      </button>
      <button
        className="action-icon-button delete"
        onClick={onDelete}
        aria-label="Delete message"
      >
        <FaTrash />
      </button>
    </motion.div>
  );
};

interface ChatMessageProps {
  content: string;
  timestamp: number;
  isUser: boolean;
  isLast?: boolean;
  bubbleStyles?: {
    text?: {
      fontSize?: number;
    };
    chatbubble?: {
      borderRadius?: number;
      padding?: number;
    };
  };
  onAvatarClick?: (e: React.MouseEvent) => void;
  showMenu?: boolean;
  menuProps?: {
    onCopy: () => void;
    onDelete: () => void;
    onShowMemories: () => void;
  };
}

export default function ChatMessage({
  content,
  timestamp,
  isUser,
  isLast = false,
  bubbleStyles = {
    text: { fontSize: 14 },
    chatbubble: { borderRadius: 20, padding: 10 },
  },
  onAvatarClick,
  showMenu = false,
  menuProps,
}: ChatMessageProps) {
  const { user } = useAuth();
  const { isIOS } = usePlatform();
  const avatar = isUser
    ? (user?.photoURL ?? DEFAULT_USER_AVATAR)
    : DITTO_AVATAR;

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      // 7 days
      return (
        date.toLocaleDateString([], { weekday: "short" }) +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } else {
      return (
        date.toLocaleDateString([], { month: "short", day: "numeric" }) +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    }
  };

  const toolType = isUser ? null : detectToolType(content);

  return (
    <motion.div
      className={`message-container ${isUser ? "user" : "ditto"}`}
      initial={isLast ? { opacity: 0, y: 10, scale: 0.95 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      <div className="message-content">
        <div
          className={`message-bubble ${isUser ? "user" : "ditto"} content-ready`}
          style={{
            ...bubbleStyles.chatbubble,
            backgroundColor: isUser ? "#007AFF" : "#1C1C1E",
          }}
        >
          {toolType && (
            <div
              className="tool-label"
              style={{
                backgroundColor: toolLabels[toolType].color,
              }}
            >
              {toolLabels[toolType].text}
            </div>
          )}
          <MarkdownRenderer content={content} />
          <div className="message-timestamp">{formatTimestamp(timestamp)}</div>
        </div>
      </div>

      <div
        className={`message-avatar ${isUser ? "user" : "ditto"} ${showMenu ? "active" : ""}`}
        onClick={onAvatarClick}
      >
        <img
          src={avatar}
          alt={isUser ? "User Avatar" : "Ditto Avatar"}
          className="avatar-image"
          draggable="false"
          loading="eager"
        />

        <AnimatePresence>
          {showMenu && menuProps && (
            <AvatarActionMenu
              isUser={isUser}
              onCopy={menuProps.onCopy}
              onDelete={menuProps.onDelete}
              onShowMemories={menuProps.onShowMemories}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
