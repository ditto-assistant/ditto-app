import { useState, useEffect, useRef, useCallback } from "react";
import AceEditor from "react-ace";
import ace from "ace-builds";
import "ace-builds/src-min-noconflict/ace";
import "ace-builds/src-min-noconflict/mode-html";
import "ace-builds/src-min-noconflict/mode-javascript";
import "ace-builds/src-min-noconflict/theme-tomorrow_night";
import "ace-builds/src-min-noconflict/ext-language_tools";
import "ace-builds/src-min-noconflict/ext-searchbox";
import {
  FaArrowLeft,
  FaPlay,
  FaCode,
  FaExpand,
  FaCompress,
  FaSearch,
  FaProjectDiagram,
  FaUndo,
  FaRedo,
  FaAlignLeft,
  FaComments,
  FaTimes,
  FaChevronDown,
  FaBrain,
} from "react-icons/fa";
import { Button, IconButton, Tooltip } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import DOMTreeViewer from "@/screens/Editor/DOMTreeViewer";
import { syncLocalScriptsWithFirestore } from "../../control/firebase"; // Changed from '../control/agent'
import { LoadingSpinner } from "../../components/ui/loading/LoadingSpinner";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import FullScreenSpinner from "../../components/ui/loading/LoadingSpinner";
import updaterAgent from "../../control/agentflows/updaterAgentFlow";
import ModelDropdown from "../../components/ModelDropdown";
import { useBalance } from "../../hooks/useBalance";
import { useAuth } from "../../hooks/useAuth";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { toast } from "react-hot-toast";
import { usePlatform } from "@/hooks/usePlatform";
import "./FullScreenEditor.css"; // Import the CSS file

// Initialize ace for production
if (import.meta.env.PROD) {
  ace.config.set(
    "basePath",
    "https://cdn.jsdelivr.net/npm/ace-builds@1.15.3/src-min-noconflict/",
  );
  ace.config.setModuleUrl(
    "ace/mode/html_worker",
    "https://cdn.jsdelivr.net/npm/ace-builds@1.15.3/src-min-noconflict/worker-html.js",
  );
  ace.config.setModuleUrl(
    "ace/mode/javascript_worker",
    "https://cdn.jsdelivr.net/npm/ace-builds@1.15.3/src-min-noconflict/worker-javascript.js",
  );
}

const useSplitPane = (initialPosition = 50) => {
  const [splitPosition, setSplitPosition] = useState(initialPosition);
  const [isMaximized, setIsMaximized] = useState("preview");
  const containerRef = useRef(null);

  return {
    splitPosition,
    isMaximized,
    setIsMaximized,
    containerRef,
  };
};

const SearchOverlay = ({
  visible,
  searchTerm,
  setSearchTerm,
  onSearch,
  onClose,
  searchResults,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch(searchTerm, e.shiftKey ? "backward" : "forward");
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="search-overlay-backdrop"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="search-overlay-container"
          >
            <motion.div className="search-overlay" layoutId="searchOverlay">
              <div className="search-input-wrapper">
                <div className="search-icon-wrapper">
                  <FaSearch size={14} className="search-icon" />
                </div>
                <input
                  type="text"
                  placeholder="Search in editor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="search-input"
                  autoFocus
                />
                {searchResults.total > 0 && (
                  <div className="search-count-wrapper">
                    <span className="search-count">
                      {searchResults.current} of {searchResults.total}
                    </span>
                  </div>
                )}
              </div>
              <div className="search-actions">
                <Tooltip title="Previous (Shift + Enter)">
                  <span>
                    <IconButton
                      onClick={() => onSearch(searchTerm, "backward")}
                      disabled={!searchTerm || searchResults.total === 0}
                      className="search-button"
                    >
                      ↑
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Next (Enter)">
                  <span>
                    <IconButton
                      onClick={() => onSearch(searchTerm, "forward")}
                      disabled={!searchTerm || searchResults.total === 0}
                      className="search-button"
                    >
                      ↓
                    </IconButton>
                  </span>
                </Tooltip>
                <div className="search-divider" />
                <Tooltip title="Close (Esc)">
                  <IconButton onClick={onClose} className="search-button">
                    ✕
                  </IconButton>
                </Tooltip>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default function FullScreenEditor({ script, onClose, onSave }) {
  const { user } = useAuth();
  const [code, setCode] = useState(script.content);
  const [previewKey, setPreviewKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const editorRef = useRef(null);
  const { isMobile } = usePlatform();
  const [searchResults, setSearchResults] = useState({ total: 0, current: 0 });
  const [viewMode, setViewMode] = useState("code"); // Changed from 'tree' to 'code'
  const [isSaving, setIsSaving] = useState(false);
  const [showScriptChat, setShowScriptChat] = useState(false);
  const [scriptChatMessages, setScriptChatMessages] = useState([]);
  const [scriptChatInput, setScriptChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { preferences, updatePreferences } = useModelPreferences();
  const scriptChatMessagesEndRef = useRef(null);
  const [scriptChatSize, setScriptChatSize] = useState({
    width: isMobile ? window.innerWidth * 0.9 : 400,
    height: isMobile ? window.innerHeight * 0.6 : 500,
  });
  const [scriptChatActionOverlay, setScriptChatActionOverlay] = useState(null);
  const [scriptChatPosition, setScriptChatPosition] = useState({
    x: isMobile ? (window.innerWidth - window.innerWidth * 0.9) / 2 : null,
    y: isMobile ? (window.innerHeight - window.innerHeight * 0.6) / 2 : null,
  });
  const dragRef = useRef(null);
  const [selectedCodeAttachment, setSelectedCodeAttachment] = useState(null);
  const [codeViewerOverlay, setCodeViewerOverlay] = useState(null);
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false);
  const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);
  const [scriptChatHistory, setScriptChatHistory] = useState([]);
  const [showMemoryOverlay, setShowMemoryOverlay] = useState(false);
  const balance = useBalance();

  const handleEditorSelection = () => {
    const editor = editorRef.current?.editor;
    if (editor) {
      const selectedText = editor.getSelectedText();
      if (selectedText) {
        setSelectedCodeAttachment(selectedText);
      }
    }
  };

  const handleScriptChatSend = async () => {
    if (!scriptChatInput.trim()) return;
    const userMessage = scriptChatInput.trim();
    const timestamp = new Date().toISOString();

    try {
      // Create the message content with code attachment and history
      const historyText =
        scriptChatHistory.length > 0
          ? "\nPrevious commands:\n" +
            scriptChatHistory
              .slice(-20)
              .map(
                (h) =>
                  `[${new Date(h.timestamp).toLocaleTimeString()}] ${h.message}`,
              )
              .join("\n")
          : "";

      const messageContent = selectedCodeAttachment
        ? `\`\`\`html\n${selectedCodeAttachment}\n\`\`\`\n\n${userMessage}`
        : userMessage;

      // Add to history before sending, maintaining 20 item window
      const newHistoryEntry = { message: userMessage, timestamp };
      setScriptChatHistory((prev) => [...prev.slice(-19), newHistoryEntry]);

      // Also maintain 20 message window for chat messages
      setScriptChatMessages((prev) => {
        const newMessages = [
          ...prev,
          {
            role: "user",
            content: messageContent,
            timestamp,
          },
        ];
        // Keep only the last 40 messages (20 pairs of user/assistant messages)
        return newMessages.slice(-40);
      });

      setScriptChatInput("");
      setSelectedCodeAttachment(null);
      setIsTyping(true);

      // Clear the selection in the editor
      const editor = editorRef.current?.editor;
      if (editor) {
        editor.clearSelection();
      }

      // Construct the prompt with history
      const usersPrompt = selectedCodeAttachment
        ? `The user has selected this section of the code to focus on:\n\`\`\`html\n${selectedCodeAttachment}\n\`\`\`\n\nThe user has also provided the following instructions:\n${userMessage}${historyText}`
        : `${userMessage}${historyText}`;

      const response = await updaterAgent(
        usersPrompt,
        code,
        preferences.programmerModel,
      );

      // Log the response in yellow
      console.log("\x1b[33m%s\x1b[0m", response);

      if (response) {
        // Add current state to history before updating
        const newHistory = editHistory.slice(0, historyIndex + 1);
        newHistory.push({ content: response });
        setEditHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);

        // Update the code
        setCode(response);
        setPreviewKey((prev) => prev + 1);

        // Add a message indicating task completion, maintaining message window
        setScriptChatMessages((prev) => {
          const newMessages = [
            ...prev,
            {
              role: "assistant",
              content: "Task completed",
              fullScript: response,
            },
          ];
          return newMessages.slice(-40);
        });
      } else {
        setScriptChatMessages((prev) => {
          const newMessages = [
            ...prev,
            {
              role: "assistant",
              content: response,
            },
          ];
          return newMessages.slice(-40);
        });
      }
    } catch (error) {
      console.error("Error in chat:", error);
      setScriptChatMessages((prev) => {
        const newMessages = [
          ...prev,
          {
            role: "assistant",
            content: "Sorry, there was an error processing your request.",
          },
        ];
        return newMessages.slice(-40);
      });
    }

    setIsTyping(false);
  };

  useEffect(() => {
    if (scriptChatMessagesEndRef.current) {
      scriptChatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scriptChatMessages]);

  const { splitPosition, isMaximized, setIsMaximized, containerRef } =
    useSplitPane();

  // Add state to track editor initialization
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Add state for edit history
  const [editHistory, setEditHistory] = useState([{ content: script.content }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Add wrapEnabled state
  const [wrapEnabled, setWrapEnabled] = useState(true);

  // Add undo/redo handlers
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCode(editHistory[newIndex].content);
    }
  };

  const handleRedo = () => {
    if (historyIndex < editHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCode(editHistory[newIndex].content);
    }
  };

  const handleRunPreview = () => {
    setPreviewKey((prev) => prev + 1);
  };

  const handleSave = async () => {
    try {
      if (code === script.content) {
        toast.error("No Changes to Save!");
        return;
      }

      setIsSaving(true);

      if (script.onSaveCallback) {
        // This is being called from HomeScreen
        await script.onSaveCallback(code);

        // Clear undo/redo history after successful save
        setEditHistory([{ content: code }]);
        setHistoryIndex(0);

        toast.success("Changes saved successfully!");
      } else {
        // This is being called from ScriptsScreen
        await onSave(code);

        // Clear undo/redo history after successful save
        setEditHistory([{ content: code }]);
        setHistoryIndex(0);

        toast.success("Changes saved successfully!");
      }

      setIsSaving(false);
    } catch (error) {
      console.error("Error saving:", error);
      setIsSaving(false);
      toast.error("Error saving changes");
    }
  };

  const toggleMaximize = (pane) => {
    setIsMaximized((current) => (current === pane ? null : pane));
  };

  const handleSearch = useCallback((term, direction = "forward") => {
    if (!editorRef.current || !term) return;

    const editor = editorRef.current.editor;
    const searchOptions = {
      backwards: direction === "backward",
      wrap: true,
      caseSensitive: false,
      wholeWord: false,
      regExp: false,
    };

    // Find all matches to get total count
    let matches = 0;
    editor.session
      .getDocument()
      .getAllLines()
      .forEach((line) => {
        let index = -1;
        while (
          (index = line
            .toLowerCase()
            .indexOf(term.toLowerCase(), index + 1)) !== -1
        ) {
          matches++;
        }
      });

    // Perform the search
    editor.find(term, searchOptions);

    // Get current match number
    let current = 1;
    const currentPos = editor.selection.getCursor();
    editor.session
      .getDocument()
      .getAllLines()
      .slice(0, currentPos.row)
      .forEach((line, row) => {
        let index = -1;
        while (
          (index = line
            .toLowerCase()
            .indexOf(term.toLowerCase(), index + 1)) !== -1
        ) {
          if (
            row < currentPos.row ||
            (row === currentPos.row && index < currentPos.column)
          ) {
            current++;
          }
        }
      });

    setSearchResults({ total: matches, current: matches > 0 ? current : 0 });
  }, []);

  useEffect(() => {
    if (searchTerm) {
      handleSearch(searchTerm);
    } else {
      setSearchResults({ total: 0, current: 0 });
    }
  }, [searchTerm, handleSearch]);

  // Update useEffect for keyboard shortcuts
  useEffect(() => {
    const eRef = editorRef.current;
    const handleKeyboardShortcuts = (e) => {
      // Check for Ctrl/Cmd + F
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault(); // Prevent default browser find
        setSearchVisible((prev) => !prev);
        if (!searchVisible) {
          setSearchTerm("");
        }
      }
    };

    // Add event listener to the editor instance only when it's ready
    if (eRef?.editor && isEditorReady) {
      const editor = eRef.editor;
      editor.commands.addCommand({
        name: "toggleSearch",
        bindKey: { win: "Ctrl-F", mac: "Command-F" },
        exec: () => {
          setSearchVisible((prev) => !prev);
          if (!searchVisible) {
            setSearchTerm("");
          }
        },
      });
    }

    // Add event listener to document for when editor is not focused
    document.addEventListener("keydown", handleKeyboardShortcuts);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyboardShortcuts);
      if (eRef?.editor && isEditorReady) {
        const editor = eRef.editor;
        editor.commands.removeCommand("toggleSearch");
      }
    };
  }, [searchVisible, isEditorReady]);

  // Add editor onLoad handler
  const handleEditorLoad = () => {
    setIsEditorReady(true);
  };

  const handleNodeUpdate = (node, updatedHTML) => {
    // Update the code state with the new HTML
    setCode(updatedHTML);

    // Add to edit history
    const newHistory = editHistory.slice(0, historyIndex + 1);
    newHistory.push({ content: updatedHTML });
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Force preview refresh
    setPreviewKey((prev) => prev + 1);
  };

  const handleClose = () => {
    // Check if content has changed
    const hasUnsavedChanges = code !== script.content;

    if (hasUnsavedChanges) {
      setShowUnsavedChanges(true);
      return;
    }

    // If launched from mini overlay (has onClose callback)
    if (onClose) {
      onClose();
    } else {
      // If launched from scripts overlay
      window.dispatchEvent(new Event("closeFullScreenEditor"));
    }
  };

  useEffect(() => {
    if (isSaving) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isSaving]);

  // Add typing indicator CSS
  useEffect(() => {
    const typingIndicatorCSS = `
            .typing-indicator {
                display: flex;
                align-items: center;
                padding: 8px;
                height: 20px;
                margin-top: 8px;
            }

            .typing-dot {
                width: 6px;
                height: 6px;
                margin: 0 2px;
                background-color: var(--text-secondary);
                border-radius: 50%;
                animation: bounce 0.6s infinite alternate;
                animation-delay: calc(var(--i) * 0.2s);
            }

            @keyframes bounce {
                0%, 100% {
                    transform: translateY(0);
                }
                50% {
                    transform: translateY(-10px);
                }
            }
        `;

    // Inject the CSS
    const style = document.createElement("style");
    style.textContent = typingIndicatorCSS;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const adjustTextareaHeight = (textarea) => {
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";

    // Calculate line height (assuming 14px font size and 1.5 line height)
    const lineHeight = 21; // 14px * 1.5
    const padding = 16; // 8px top + 8px bottom
    const maxHeight = lineHeight * 6 + padding; // 6 rows max

    // Set new height
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  const handleScriptChatBubbleClick = (e, index, role) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX =
      e.touches?.[0]?.clientX || e.clientX || rect.left + rect.width / 2;
    const clientY =
      e.touches?.[0]?.clientY || e.clientY || rect.top + rect.height / 2;

    setScriptChatActionOverlay({
      index,
      role,
      clientX,
      clientY,
    });
  };

  const handleScriptChatCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
    setScriptChatActionOverlay(null);
  };

  const handleScriptChatDelete = (index) => {
    const messageToDelete = scriptChatMessages[index];
    if (messageToDelete.role === "user") {
      // Remove from history if it exists
      setScriptChatHistory((prev) =>
        prev.filter((h) => h.timestamp !== messageToDelete.timestamp),
      );
    }
    setScriptChatMessages((prev) => prev.filter((_, i) => i !== index));
    setScriptChatActionOverlay(null);
  };

  const handleDragStart = (e) => {
    if (
      e.target.tagName === "TEXTAREA" ||
      e.target.closest("button") ||
      e.target === dragRef.current
    )
      return;

    const container = dragRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleDrag = (e) => {
      requestAnimationFrame(() => {
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;

        // Keep window within viewport bounds
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        setScriptChatPosition({
          x: Math.max(0, Math.min(x, maxX)),
          y: Math.max(0, Math.min(y, maxY)),
        });
      });
    };

    const handleDragEnd = () => {
      document.removeEventListener("mousemove", handleDrag);
      document.removeEventListener("mouseup", handleDragEnd);
    };

    document.addEventListener("mousemove", handleDrag);
    document.addEventListener("mouseup", handleDragEnd);
  };

  // Add this useEffect to handle window resizing
  useEffect(() => {
    const handleWindowResize = () => {
      const maxWidth = window.innerWidth - 24; // Account for margins
      const maxHeight = window.innerHeight - 24; // Account for margins

      setScriptChatSize((prevSize) => ({
        width: Math.min(prevSize.width, maxWidth),
        height: Math.min(prevSize.height, maxHeight),
      }));

      setScriptChatPosition((prevPosition) => ({
        x: Math.min(prevPosition.x, maxWidth - scriptChatSize.width),
        y: Math.min(prevPosition.y, maxHeight - scriptChatSize.height),
      }));
    };

    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [scriptChatSize]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        scriptChatActionOverlay &&
        !e.target.closest(".scriptChatActionOverlay")
      ) {
        setScriptChatActionOverlay(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [scriptChatActionOverlay]);

  // Add helper function for closing editor
  const closeEditor = async () => {
    setShowLoadingSpinner(true); // Show the loading spinner

    await syncLocalScriptsWithFirestore(user?.uid, "webApps");
    await syncLocalScriptsWithFirestore(user?.uid, "openSCAD");

    const localWebApps = JSON.parse(localStorage.getItem("webApps")) || [];
    const localOpenSCAD = JSON.parse(localStorage.getItem("openSCAD")) || [];

    window.dispatchEvent(
      new CustomEvent("scriptsUpdated", {
        detail: {
          webApps: localWebApps,
          openSCAD: localOpenSCAD,
        },
      }),
    );

    setShowLoadingSpinner(false); // Hide the loading spinner
    onClose();
  };

  // Add handler for history reset
  const handleResetHistory = () => {
    setScriptChatMessages([]);
    setScriptChatHistory([]);
  };

  // Add this useEffect to handle viewport height changes (e.g., when keyboard opens)
  useEffect(() => {
    const handleResize = () => {
      // Only update if we're on mobile
      if (window.innerWidth <= 768) {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty("--vh", `${vh}px`);
      }
    };

    handleResize(); // Initial call
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Update the scriptChatMessages ref scroll behavior
  useEffect(() => {
    if (scriptChatMessagesEndRef.current) {
      // Add a small delay to ensure content is rendered
      setTimeout(() => {
        scriptChatMessagesEndRef.current.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }, 100);
    }
  }, [scriptChatMessages]);

  // Add useEffect to handle clicking outside the settings panel
  useEffect(() => {
    if (!showMemoryOverlay) return;

    const handleClickOutside = (event) => {
      // Check if click is outside the settings panel and not on the settings button
      const settingsPanel = document.querySelector(".script-chat-settings");
      const settingsButton = document.querySelector(".settings-button");

      if (
        settingsPanel &&
        settingsButton &&
        !settingsPanel.contains(event.target) &&
        !settingsButton.contains(event.target)
      ) {
        setShowMemoryOverlay(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMemoryOverlay]);

  return (
    <div className="editor-container">
      <motion.div
        className="editor-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="header-left">
          <Tooltip title="Back">
            <IconButton onClick={handleClose} className="icon-button">
              <FaArrowLeft />
            </IconButton>
          </Tooltip>
          <div className="title-container">
            <h3 className="editor-title">{script.name}</h3>
            <span className="script-type">
              {script.scriptType === "webApps" ? "Web App" : "OpenSCAD"}
            </span>
          </div>
        </div>
        <div className="actions">
          <Tooltip title="Chat">
            <IconButton
              onClick={() => setShowScriptChat((prev) => !prev)}
              className={`icon-button ${showScriptChat ? "active" : ""}`}
            >
              <FaComments size={16} />
            </IconButton>
          </Tooltip>
          <div className="divider" />
          <Tooltip title="Run">
            <IconButton onClick={handleRunPreview} className="icon-button">
              <FaPlay size={16} />
            </IconButton>
          </Tooltip>
          <Button
            onClick={handleSave}
            variant="contained"
            className="save-button"
            size={isMobile ? "small" : "medium"}
          >
            Save
          </Button>
        </div>
      </motion.div>
      <div ref={containerRef} className="editor-content">
        <motion.div
          className="editor-pane"
          animate={{
            width: isMobile
              ? "100%"
              : isMaximized === "editor"
                ? "100%"
                : isMaximized === "preview"
                  ? "0%"
                  : `${splitPosition}%`,
            height: isMobile
              ? isMaximized === "editor"
                ? "100%"
                : isMaximized === "preview"
                  ? "0%"
                  : `${splitPosition}%`
              : "100%",
          }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        >
          <div className="pane-header">
            <span className="pane-title">Editor</span>
            <div className="pane-actions">
              <Tooltip title="Undo">
                <IconButton
                  onClick={handleUndo}
                  disabled={historyIndex === 0}
                  className="icon-button"
                >
                  <FaUndo
                    size={12}
                    color={
                      historyIndex === 0
                        ? "var(--text-secondary)"
                        : "var(--text)"
                    }
                  />
                </IconButton>
              </Tooltip>
              <Tooltip title="Redo">
                <IconButton
                  onClick={handleRedo}
                  disabled={historyIndex === editHistory.length - 1}
                  className="icon-button"
                >
                  <FaRedo
                    size={12}
                    color={
                      historyIndex === editHistory.length - 1
                        ? "var(--text-secondary)"
                        : "var(--text)"
                    }
                  />
                </IconButton>
              </Tooltip>
              <div className="divider" />
              <div className="search-container">
                <SearchOverlay
                  visible={searchVisible}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  onSearch={handleSearch}
                  onClose={() => {
                    setSearchVisible(false);
                    setSearchTerm("");
                  }}
                  searchResults={searchResults}
                />
                <Tooltip title={searchVisible ? "Close Search" : "Search"}>
                  <IconButton
                    onClick={() => setSearchVisible(!searchVisible)}
                    className={`icon-button ${searchVisible ? "active" : ""}`}
                  >
                    <FaSearch size={12} />
                  </IconButton>
                </Tooltip>
              </div>
              <Tooltip title="Toggle Word Wrap">
                <IconButton
                  onClick={() => setWrapEnabled((prev) => !prev)}
                  className={`icon-button ${wrapEnabled ? "active" : ""}`}
                >
                  <FaAlignLeft size={12} />
                </IconButton>
              </Tooltip>
              <div className="divider" />
              <Tooltip
                title={isMaximized === "editor" ? "Restore" : "Maximize"}
              >
                <IconButton
                  onClick={() => toggleMaximize("editor")}
                  className="icon-button"
                >
                  {isMaximized === "editor" ? (
                    <FaCompress size={12} />
                  ) : (
                    <FaExpand size={12} />
                  )}
                </IconButton>
              </Tooltip>
            </div>
          </div>
          <div className="view-toggle">
            <Tooltip title="Code View">
              <IconButton
                onClick={() => setViewMode("code")}
                className={`icon-button ${viewMode === "code" ? "active" : ""}`}
              >
                <FaCode size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="DOM Tree View">
              <IconButton
                onClick={() => setViewMode("tree")}
                className={`icon-button ${viewMode === "tree" ? "active" : ""}`}
              >
                <FaProjectDiagram size={16} />
              </IconButton>
            </Tooltip>
          </div>
          <div style={{ height: "calc(100% - 40px)" }}>
            {viewMode === "code" ? (
              <AceEditor
                ref={editorRef}
                mode="javascript"
                theme="tomorrow_night"
                onChange={setCode}
                value={code}
                name="full-screen-editor"
                width="100%"
                height="100%"
                fontSize={14}
                showPrintMargin={false}
                showGutter={true}
                highlightActiveLine={true}
                onLoad={handleEditorLoad}
                wrapEnabled={wrapEnabled}
                setOptions={{
                  enableBasicAutocompletion: true,
                  enableLiveAutocompletion: true,
                  enableSnippets: true,
                  showLineNumbers: true,
                  tabSize: 2,
                  useWorker: false,
                  wrap: wrapEnabled,
                  fontFamily: "JetBrains Mono, monospace",
                  theme: "tomorrow_night",
                }}
                onSelectionChange={handleEditorSelection}
                style={{
                  backgroundColor: "var(--background)",
                  borderRadius: "4px",
                }}
              />
            ) : (
              <DOMTreeViewer
                htmlContent={code}
                onNodeUpdate={handleNodeUpdate}
                setShowScriptChat={setShowScriptChat}
                setSelectedCodeAttachment={setSelectedCodeAttachment}
              />
            )}
          </div>
        </motion.div>

        <motion.div
          className="preview-pane"
          animate={{
            width: isMobile
              ? "100%"
              : isMaximized === "preview"
                ? "100%"
                : isMaximized === "editor"
                  ? "0%"
                  : `${100 - splitPosition}%`,
            height: isMobile
              ? isMaximized === "preview"
                ? "100%"
                : isMaximized === "editor"
                  ? "0%"
                  : `${100 - splitPosition}%`
              : "100%",
          }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
        >
          <div className="pane-header">
            <span className="pane-title">Preview</span>
            <div className="pane-actions">
              {isMaximized === "preview" && (
                <>
                  <Tooltip title="Undo">
                    <IconButton
                      onClick={handleUndo}
                      disabled={historyIndex === 0}
                      className="icon-button"
                    >
                      <FaUndo
                        size={12}
                        color={
                          historyIndex === 0
                            ? "var(--text-secondary)"
                            : "var(--text)"
                        }
                      />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Redo">
                    <IconButton
                      onClick={handleRedo}
                      disabled={historyIndex === editHistory.length - 1}
                      className="icon-button"
                    >
                      <FaRedo
                        size={12}
                        color={
                          historyIndex === editHistory.length - 1
                            ? "var(--text-secondary)"
                            : "var(--text)"
                        }
                      />
                    </IconButton>
                  </Tooltip>
                  <div className="divider" />
                </>
              )}
              <button
                onClick={() => toggleMaximize("preview")}
                className="show-editor-button"
              >
                {isMaximized === "preview" ? (
                  <>
                    <span className="show-editor-text">Show Editor</span>
                    <FaChevronDown size={12} />
                  </>
                ) : (
                  <FaExpand size={12} />
                )}
              </button>
            </div>
          </div>
          <iframe
            key={previewKey}
            srcDoc={code}
            className="preview"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="Preview"
          />
        </motion.div>
      </div>
      <AnimatePresence>
        {isSaving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="saving-overlay"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="saving-content"
            >
              <LoadingSpinner size={50} inline={true} />
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="saving-text"
              >
                Saving changes...
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScriptChat && (
          <motion.div
            ref={dragRef}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="script-chat-container"
            style={{
              width: `${scriptChatSize.width}px`,
              height: `${scriptChatSize.height}px`,
              left:
                scriptChatPosition.x !== null
                  ? `${scriptChatPosition.x}px`
                  : "auto",
              top:
                scriptChatPosition.y !== null
                  ? `${scriptChatPosition.y}px`
                  : "90px",
              cursor: "move",
            }}
            onMouseDown={handleDragStart}
          >
            <div className="script-chat-header">
              <div className="script-chat-title">Programmer Agent</div>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <Tooltip title="Settings">
                  <IconButton
                    className={`icon-button settings-button ${showMemoryOverlay ? "active" : ""}`}
                    onClick={() => setShowMemoryOverlay((prev) => !prev)}
                  >
                    <FaBrain size={16} />
                  </IconButton>
                </Tooltip>
                <IconButton
                  onClick={() => setShowScriptChat(false)}
                  className="icon-button"
                >
                  <FaTimes size={16} />
                </IconButton>
              </div>

              {/* Add Settings Panel */}
              <AnimatePresence>
                {showMemoryOverlay && (
                  <motion.div
                    className="script-chat-settings"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div style={{ padding: "16px" }}>
                      <div style={{ marginBottom: "16px" }}>
                        <h4
                          style={{
                            margin: "0 0 8px 0",
                            color: "var(--text)",
                            fontSize: "14px",
                          }}
                        >
                          Model
                        </h4>
                        <ModelDropdown
                          value={preferences.programmerModel}
                          onChange={(newModel) => {
                            updatePreferences({ programmerModel: newModel });
                          }}
                          hasEnoughBalance={balance.data?.hasPremium}
                        />
                      </div>

                      <button
                        onClick={handleResetHistory}
                        style={{
                          width: "100%",
                          padding: "8px",
                          backgroundColor: "transparent",
                          color: "var(--danger)",
                          border: "1px solid var(--danger)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "14px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        Reset Chat History
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="script-chat-messages">
              {scriptChatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={
                    msg.role === "user" ? "user-message" : "assistant-message"
                  }
                  style={{
                    position: "relative",
                    cursor: "pointer",
                    filter:
                      scriptChatActionOverlay?.index === index
                        ? "blur(2px)"
                        : "none",
                    transition: "filter 0.2s ease",
                  }}
                  onClick={(e) =>
                    handleScriptChatBubbleClick(e, index, msg.role)
                  }
                >
                  {msg.role === "user" ? (
                    <>
                      {msg.content.includes("```html") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCodeViewerOverlay(msg.content);
                          }}
                          className="view-code-button"
                        >
                          View Code
                        </button>
                      )}
                      <div className="message-text">
                        {/* Only show the user's message, not the history */}
                        {msg.content.split("```")[2]?.split("\n\n")[1] ||
                          msg.content.split("\nPrevious commands:")[0]}
                      </div>
                      {msg.timestamp && (
                        <div className="message-timestamp">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <ReactMarkdown
                        components={{
                          code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(
                              className || "",
                            );
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      {msg.fullScript && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(msg.fullScript);
                            toast.success("Copied!");
                          }}
                          className="copy-full-script-button"
                        >
                          Copy Full Script
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}

              {/* Add code viewer overlay */}
              <AnimatePresence>
                {codeViewerOverlay && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="code-viewer-overlay"
                    onClick={() => setCodeViewerOverlay(null)}
                  >
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.95 }}
                      className="code-viewer-content"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="code-viewer-body">
                        {/* Extract and display only the code snippet */}
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language="html"
                          PreTag="div"
                        >
                          {codeViewerOverlay
                            .split("```html\n")[1]
                            .split("```")[0]
                            .trim()}
                        </SyntaxHighlighter>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(
                              codeViewerOverlay
                                .split("```html\n")[1]
                                .split("```")[0]
                                .trim(),
                            );
                            toast.success("Copied!");
                            setCodeViewerOverlay(null);
                          }}
                          className="code-viewer-copy-button"
                        >
                          Copy Code
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {scriptChatActionOverlay && (
                <div
                  className="script-chat-action-overlay"
                  style={{
                    position: "fixed",
                    left: scriptChatActionOverlay.clientX,
                    top: scriptChatActionOverlay.clientY,
                    transform: "translate(-50%, -50%)",
                    zIndex: 1000,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Show Copy option for user messages */}
                  {scriptChatActionOverlay.role === "user" && (
                    <button
                      onClick={() => {
                        const message =
                          scriptChatMessages[scriptChatActionOverlay.index];
                        const textToCopy =
                          message.content.split("```")[2]?.split("\n\n")[1] ||
                          message.content;
                        handleScriptChatCopy(textToCopy);
                      }}
                      className="script-chat-action-button"
                    >
                      Copy
                    </button>
                  )}
                  <button
                    onClick={() =>
                      handleScriptChatDelete(scriptChatActionOverlay.index)
                    }
                    className="script-chat-action-button danger"
                  >
                    Delete
                  </button>
                </div>
              )}
              {isTyping && (
                <div className="typing-indicator">
                  <div className="typing-dot" style={{ "--i": 0 }} />
                  <div className="typing-dot" style={{ "--i": 1 }} />
                  <div className="typing-dot" style={{ "--i": 2 }} />
                </div>
              )}
              <div ref={scriptChatMessagesEndRef} />
            </div>
            <div className="script-chat-input-container">
              {selectedCodeAttachment && (
                <div className="code-attachment-preview">
                  <pre className="code-preview">
                    {selectedCodeAttachment.length > 100
                      ? selectedCodeAttachment.substring(0, 100) + "..."
                      : selectedCodeAttachment}
                  </pre>
                  <FaTimes
                    className="remove-code-button"
                    onClick={() => setSelectedCodeAttachment(null)}
                  />
                </div>
              )}
              <textarea
                value={scriptChatInput}
                onChange={(e) => {
                  setScriptChatInput(e.target.value);
                  adjustTextareaHeight(e.target);
                }}
                onKeyDown={(e) => {
                  if (isMobile) {
                    // Mobile behavior - just add newlines
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const newValue = scriptChatInput + "\n";
                      setScriptChatInput(newValue);
                      setTimeout(() => adjustTextareaHeight(e.target), 0);
                    }
                  } else {
                    // Desktop behavior - Enter sends, Shift+Enter adds newline
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleScriptChatSend();
                    } else if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      const newValue = scriptChatInput + "\n";
                      setScriptChatInput(newValue);
                      setTimeout(() => adjustTextareaHeight(e.target), 0);
                    }
                  }
                }}
                placeholder="Send a command..."
                className="script-chat-input"
              />
              <button
                onClick={handleScriptChatSend}
                className="script-chat-send-button"
              >
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUnsavedChanges && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="unsaved-overlay"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="unsaved-content"
            >
              <h3 className="unsaved-title">Unsaved Changes</h3>
              <p className="unsaved-text">
                You have unsaved changes. Would you like to save before closing?
              </p>
              <div className="unsaved-actions">
                <motion.button
                  whileHover={{
                    scale: 1.02,
                    backgroundColor: `var(--hover)CC`,
                  }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowUnsavedChanges(false)}
                  className="unsaved-secondary-button"
                >
                  Cancel
                </motion.button>
                <div className="unsaved-primary-actions">
                  <motion.button
                    whileHover={{
                      scale: 1.02,
                      backgroundColor: `var(--danger)15`,
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      await closeEditor();
                    }}
                    className="unsaved-danger-button"
                  >
                    {"Don't Save"}
                  </motion.button>
                  <motion.button
                    whileHover={{
                      scale: 1.02,
                      backgroundColor: "var(--secondary)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    onClick={async () => {
                      await handleSave();
                      await closeEditor();
                    }}
                    className="unsaved-primary-button"
                  >
                    Save & Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add the loading spinner with a backdrop */}
      {showLoadingSpinner && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="loading-overlay"
        >
          <FullScreenSpinner text="Cleaning up" />
        </motion.div>
      )}
    </div>
  );
}
