import React, { useState, useEffect, useRef, useCallback } from 'react';
import AceEditor from 'react-ace';
import { FaArrowLeft, FaPlay, FaCode, FaExpand, FaCompress, FaSearch, FaProjectDiagram, FaUndo, FaRedo, FaAlignLeft, FaComments, FaTimes, FaChevronDown, FaCopy } from 'react-icons/fa';
import { Button, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from './Toast';
import DOMTreeViewer from './DOMTreeViewer';
import { parseHTML, stringifyHTML } from '../utils/htmlParser';
import { saveScriptToFirestore, syncLocalScriptsWithFirestore, getModelPreferencesFromFirestore } from '../control/firebase'; // Changed from '../control/agent'
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';
import { textEmbed } from '../api/LLM';
import { htmlTemplate, htmlSystemTemplate } from '../ditto/templates/htmlTemplate';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useIntentRecognition } from '../hooks/useIntentRecognition';
import FullScreenSpinner from './LoadingSpinner';
import updaterAgent from '../control/updaterAgent';

const darkModeColors = {
    background: '#1E1F22',
    foreground: '#2B2D31',
    primary: '#5865F2',
    secondary: '#4752C4',
    text: '#FFFFFF',
    textSecondary: '#B5BAC1',
    border: '#1E1F22',
    hover: '#32353B',
    headerBackground: '#2B2D31',
    inputBackground: '#1E1F22',
    danger: '#ff4444',
};

const useSplitPane = (isMobile, initialPosition = 50) => {
    const [splitPosition, setSplitPosition] = useState(initialPosition);
    const [isMaximized, setIsMaximized] = useState('preview');
    const isDragging = useRef(false);
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
    isMobile 
}) => {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onSearch(searchTerm, e.shiftKey ? 'backward' : 'forward');
        }
        if (e.key === 'Escape') {
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
                        style={styles.searchOverlayBackdrop}
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        style={styles.searchOverlayContainer}
                    >
                        <motion.div
                            style={styles.searchOverlay}
                            layoutId="searchOverlay"
                        >
                            <div style={styles.searchInputWrapper}>
                                <div style={styles.searchIconWrapper}>
                                    <FaSearch size={14} style={styles.searchIcon} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search in editor..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    style={styles.searchInput}
                                    autoFocus
                                />
                                {searchResults.total > 0 && (
                                    <div style={styles.searchCountWrapper}>
                                        <span style={styles.searchCount}>
                                            {searchResults.current} of {searchResults.total}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={styles.searchActions}>
                                <Tooltip title="Previous (Shift + Enter)">
                                    <span>
                                        <IconButton
                                            onClick={() => onSearch(searchTerm, 'backward')}
                                            disabled={!searchTerm || searchResults.total === 0}
                                            sx={styles.searchButton}
                                        >
                                            ↑
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <Tooltip title="Next (Enter)">
                                    <span>
                                        <IconButton
                                            onClick={() => onSearch(searchTerm, 'forward')}
                                            disabled={!searchTerm || searchResults.total === 0}
                                            sx={styles.searchButton}
                                        >
                                            ↓
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                <div style={styles.searchDivider} />
                                <Tooltip title="Close (Esc)">
                                    <IconButton
                                        onClick={onClose}
                                        sx={styles.searchButton}
                                    >
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

const FullScreenEditor = ({ script, onClose, onSave }) => {
    const navigate = useNavigate();
    const [code, setCode] = useState(script.content);
    const [previewKey, setPreviewKey] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchVisible, setSearchVisible] = useState(false);
    const editorRef = useRef(null);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [showToast, setShowToast] = useState(false);
    const [searchResults, setSearchResults] = useState({ total: 0, current: 0 });
    const [viewMode, setViewMode] = useState('code'); // Changed from 'tree' to 'code'
    const [selectedNode, setSelectedNode] = useState(null);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success'); // 'success' or 'warning'
    const [isSaving, setIsSaving] = useState(false);
    const [showScriptChat, setShowScriptChat] = useState(false);
    const [scriptChatMessages, setScriptChatMessages] = useState([]);
    const [scriptChatInput, setScriptChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scriptChatMessagesEndRef = useRef(null);
    const [modelPreferences, setModelPreferences] = useState({ programmerModel: 'claude-3-5-sonnet' });
    const userID = localStorage.getItem('userID');
    const isMobileRef = useRef(false);
    const [scriptChatSize, setScriptChatSize] = useState({
        width: isMobile ? window.innerWidth * 0.9 : 400,
        height: isMobile ? window.innerHeight * 0.6 : 500
    });
    const [messageBoxHeight, setMessageBoxHeight] = useState(40);
    const resizingRef = useRef(null);
    const [scriptChatActionOverlay, setScriptChatActionOverlay] = useState(null);
    const [scriptChatCopied, setScriptChatCopied] = useState(false);
    const [scriptChatPosition, setScriptChatPosition] = useState({
        x: isMobile ? (window.innerWidth - (window.innerWidth * 0.9)) / 2 : null,
        y: isMobile ? (window.innerHeight - (window.innerHeight * 0.6)) / 2 : null
    });
    const dragRef = useRef(null);

    // Add this state to track if we're currently resizing
    const [isResizing, setIsResizing] = useState(false);

    // Add new state for selected code
    const [selectedCodeAttachment, setSelectedCodeAttachment] = useState(null);

    // Add new state for code viewer overlay
    const [codeViewerOverlay, setCodeViewerOverlay] = useState(null);

    // Add new state for intent warning overlay
    const [showIntentWarning, setShowIntentWarning] = useState(false);
    const [intentConfidence, setIntentConfidence] = useState(null);

    // Use the intent recognition hook
    const { isLoaded, models } = useIntentRecognition();

    // Add new state for unsaved changes overlay
    const [showUnsavedChanges, setShowUnsavedChanges] = useState(false);

    // Add state for showing the loading spinner
    const [showLoadingSpinner, setShowLoadingSpinner] = useState(false);

    // Add new state for chat history
    const [scriptChatHistory, setScriptChatHistory] = useState([]);

    useEffect(() => {
        // Fetch user's preferred programmer model
        getModelPreferencesFromFirestore(userID).then(prefs => {
            setModelPreferences(prefs);
        });
    }, [userID]);

    useEffect(() => {
        isMobileRef.current = checkIfMobile();
    }, []);

    const checkIfMobile = () => {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /android/i.test(userAgent) || /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    };

    // Add function to track selection in AceEditor
    const handleEditorSelection = (selection) => {
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
            // Get embedding for the user's message
            const embedding = await textEmbed(userMessage);
            
            // Classify intent
            const intentPredictions = await models.classify(embedding);
            console.log('Intent Predictions:', intentPredictions);

            // Check HTMLAgent intent confidence
            const htmlAgentConfidence = intentPredictions.HTMLAgent;
            setIntentConfidence(htmlAgentConfidence);

            if (htmlAgentConfidence < 0.4) {
                setShowIntentWarning(true);
                return;
            }

            // Create the message content with code attachment and history
            const historyText = scriptChatHistory.length > 0 ? 
                '\nPrevious commands:\n' + scriptChatHistory.slice(-20).map(h => 
                    `[${new Date(h.timestamp).toLocaleTimeString()}] ${h.message}`
                ).join('\n') : '';

            const messageContent = selectedCodeAttachment ? 
                `\`\`\`html\n${selectedCodeAttachment}\n\`\`\`\n\n${userMessage}` : 
                userMessage;
            
            // Add to history before sending, maintaining 20 item window
            const newHistoryEntry = { message: userMessage, timestamp };
            setScriptChatHistory(prev => [...prev.slice(-19), newHistoryEntry]);
            
            // Also maintain 20 message window for chat messages
            setScriptChatMessages(prev => {
                const newMessages = [...prev, { 
                    role: 'user', 
                    content: messageContent,
                    timestamp 
                }];
                // Keep only the last 40 messages (20 pairs of user/assistant messages)
                return newMessages.slice(-40);
            });

            setScriptChatInput('');
            setSelectedCodeAttachment(null);
            setIsTyping(true);

            // Clear the selection in the editor
            const editor = editorRef.current?.editor;
            if (editor) {
                editor.clearSelection();
            }

            // Construct the prompt with history
            const usersPrompt = selectedCodeAttachment ?
                `The user has selected this section of the code to focus on:\n\`\`\`html\n${selectedCodeAttachment}\n\`\`\`\n\nThe user has also provided the following instructions:\n${userMessage}${historyText}`
                :
                `${userMessage}${historyText}`;

            const response = await updaterAgent(usersPrompt, code, modelPreferences.programmerModel, true);
            
            // Log the response in yellow
            console.log('\x1b[33m%s\x1b[0m', response);

            if (response) {
                // Add current state to history before updating
                const newHistory = editHistory.slice(0, historyIndex + 1);
                newHistory.push({ content: response });
                setEditHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
                
                // Update the code
                setCode(response);
                setPreviewKey(prev => prev + 1);

                // Add a message indicating task completion, maintaining message window
                setScriptChatMessages(prev => {
                    const newMessages = [...prev, { 
                        role: 'assistant', 
                        content: 'Task completed', 
                        fullScript: response 
                    }];
                    return newMessages.slice(-40);
                });
            } else {
                setScriptChatMessages(prev => {
                    const newMessages = [...prev, { 
                        role: 'assistant', 
                        content: response 
                    }];
                    return newMessages.slice(-40);
                });
            }
        } catch (error) {
            console.error('Error in chat:', error);
            setScriptChatMessages(prev => {
                const newMessages = [...prev, { 
                    role: 'assistant', 
                    content: 'Sorry, there was an error processing your request.' 
                }];
                return newMessages.slice(-40);
            });
        }

        setIsTyping(false);
    };

    useEffect(() => {
        if (scriptChatMessagesEndRef.current) {
            scriptChatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [scriptChatMessages]);

    const {
        splitPosition,
        isMaximized,
        setIsMaximized,
        containerRef,
    } = useSplitPane(isMobile);

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
        setPreviewKey(prev => prev + 1);
    };

    const handleSave = async () => {
        try {
            // Check if content has changed
            if (code === script.content) {
                setToastMessage('No Changes to Save!');
                setToastType('warning');
                setShowToast(true);
                return;
            }

            setIsSaving(true);

            // Let the parent handle the save
            await onSave(code);

            // Clear undo/redo history after successful save
            setEditHistory([{ content: code }]);
            setHistoryIndex(0);

            setIsSaving(false);
            setToastMessage('Changes saved successfully!');
            setToastType('success');
            setShowToast(true);
        } catch (error) {
            console.error('Error saving:', error);
            setIsSaving(false);
            setToastMessage('Error saving changes');
            setToastType('error');
            setShowToast(true);
        }
    };

    const toggleMaximize = (pane) => {
        setIsMaximized(current => current === pane ? null : pane);
    };

    const handleSearch = useCallback((term, direction = 'forward') => {
        if (!editorRef.current || !term) return;
        
        const editor = editorRef.current.editor;
        const searchOptions = {
            backwards: direction === 'backward',
            wrap: true,
            caseSensitive: false,
            wholeWord: false,
            regExp: false
        };

        // Find all matches to get total count
        let matches = 0;
        const pos = editor.selection.getCursor();
        editor.session.getDocument().getAllLines().forEach((line, row) => {
            let index = -1;
            while ((index = line.toLowerCase().indexOf(term.toLowerCase(), index + 1)) !== -1) {
                matches++;
            }
        });
        
        // Perform the search
        editor.find(term, searchOptions);
        
        // Get current match number
        let current = 1;
        const currentPos = editor.selection.getCursor();
        editor.session.getDocument().getAllLines().slice(0, currentPos.row).forEach((line, row) => {
            let index = -1;
            while ((index = line.toLowerCase().indexOf(term.toLowerCase(), index + 1)) !== -1) {
                if (row < currentPos.row || (row === currentPos.row && index < currentPos.column)) {
                    current++;
                }
            }
        });

        setSearchResults({ total: matches, current: matches > 0 ? current : 0 });
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch(searchTerm, e.shiftKey ? 'backward' : 'forward');
        }
        if (e.key === 'Escape') {
            setSearchVisible(false);
            setSearchTerm('');
        }
    };

    useEffect(() => {
        if (searchTerm) {
            handleSearch(searchTerm);
        } else {
            setSearchResults({ total: 0, current: 0 });
        }
    }, [searchTerm, handleSearch]);

    // Update useEffect for keyboard shortcuts
    useEffect(() => {
        const handleKeyboardShortcuts = (e) => {
            // Check for Ctrl/Cmd + F
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault(); // Prevent default browser find
                setSearchVisible(prev => !prev);
                if (!searchVisible) {
                    setSearchTerm('');
                }
            }
        };

        // Add event listener to the editor instance only when it's ready
        if (editorRef.current?.editor && isEditorReady) {
            const editor = editorRef.current.editor;
            editor.commands.addCommand({
                name: 'toggleSearch',
                bindKey: { win: 'Ctrl-F', mac: 'Command-F' },
                exec: () => {
                    setSearchVisible(prev => !prev);
                    if (!searchVisible) {
                        setSearchTerm('');
                    }
                }
            });
        }

        // Add event listener to document for when editor is not focused
        document.addEventListener('keydown', handleKeyboardShortcuts);

        // Cleanup
        return () => {
            document.removeEventListener('keydown', handleKeyboardShortcuts);
            if (editorRef.current?.editor && isEditorReady) {
                const editor = editorRef.current.editor;
                editor.commands.removeCommand('toggleSearch');
            }
        };
    }, [searchVisible, isEditorReady]);

    // Add editor onLoad handler
    const handleEditorLoad = (editor) => {
        setIsEditorReady(true);
    };

    const onNodeClick = useCallback((node) => {
        setSelectedNode(node);
    }, []);

    const handleNodeUpdate = (node, updatedHTML) => {
        // Update the code state with the new HTML
        setCode(updatedHTML);
        
        // Add to edit history
        const newHistory = editHistory.slice(0, historyIndex + 1);
        newHistory.push({ content: updatedHTML });
        setEditHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        
        // Force preview refresh
        setPreviewKey(prev => prev + 1);
    };

    const findCorrespondingNode = (doc, targetNode) => {
        const walk = (node) => {
            if (node.isEqualNode(targetNode)) {
                return node;
            }
            for (let child of node.childNodes) {
                const result = walk(child);
                if (result) return result;
            }
            return null;
        };
        return walk(doc.documentElement);
    };

    const handleClose = async () => {
        // Check if there are unsaved changes
        if (historyIndex > 0 || code !== script.content) {
            setShowUnsavedChanges(true);
            return;
        }

        await closeEditor();
    };

    useEffect(() => {
        if (isSaving) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
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
                background-color: ${darkModeColors.textSecondary};
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
        const style = document.createElement('style');
        style.textContent = typingIndicatorCSS;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const handleResizeMouseDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.pageX;
        const startY = e.pageY;
        const startWidth = scriptChatSize.width;
        const startHeight = scriptChatSize.height;

        const handleResize = (e) => {
            requestAnimationFrame(() => {
                const newWidth = Math.max(300, startWidth + (e.pageX - startX));
                const newHeight = Math.max(300, startHeight + (e.pageY - startY));
                
                setScriptChatSize({
                    width: newWidth,
                    height: newHeight
                });
            });
        };

        const handleResizeEnd = () => {
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', handleResizeEnd);
        };

        document.addEventListener('mousemove', handleResize);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const adjustTextareaHeight = (textarea) => {
        if (!textarea) return;
        
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
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
        const clientX = e.touches?.[0]?.clientX || e.clientX || rect.left + rect.width / 2;
        const clientY = e.touches?.[0]?.clientY || e.clientY || rect.top + rect.height / 2;

        setScriptChatActionOverlay({
            index,
            role,
            clientX,
            clientY,
        });
    };

    const handleScriptChatCopy = (text) => {
        navigator.clipboard.writeText(text);
        setScriptChatCopied(true);
        setScriptChatActionOverlay(null);
        setTimeout(() => setScriptChatCopied(false), 2000);
    };

    const handleScriptChatDelete = (index) => {
        const messageToDelete = scriptChatMessages[index];
        if (messageToDelete.role === 'user') {
            // Remove from history if it exists
            setScriptChatHistory(prev => 
                prev.filter(h => h.timestamp !== messageToDelete.timestamp)
            );
        }
        setScriptChatMessages(prev => prev.filter((_, i) => i !== index));
        setScriptChatActionOverlay(null);
    };

    const handleDragStart = (e) => {
        if (e.target.tagName === 'TEXTAREA' || 
            e.target.closest('button') || 
            isResizing || 
            e.target === dragRef.current) return;
        
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
                    y: Math.max(0, Math.min(y, maxY))
                });
            });
        };

        const handleDragEnd = () => {
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('mouseup', handleDragEnd);
        };

        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
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

        window.addEventListener('resize', handleWindowResize);

        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, [scriptChatSize]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (scriptChatActionOverlay && !e.target.closest('.scriptChatActionOverlay')) {
                setScriptChatActionOverlay(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [scriptChatActionOverlay]);

    // Add helper function for closing editor
    const closeEditor = async () => {
        setShowLoadingSpinner(true); // Show the loading spinner

        const userID = localStorage.getItem("userID");
        
        await syncLocalScriptsWithFirestore(userID, "webApps");
        await syncLocalScriptsWithFirestore(userID, "openSCAD");
        
        const localWebApps = JSON.parse(localStorage.getItem("webApps")) || [];
        const localOpenSCAD = JSON.parse(localStorage.getItem("openSCAD")) || [];
        
        window.dispatchEvent(new CustomEvent('scriptsUpdated', { 
            detail: { 
                webApps: localWebApps,
                openSCAD: localOpenSCAD
            }
        }));
        
        setShowLoadingSpinner(false); // Hide the loading spinner
        onClose();
    };

    // Update the intent warning keydown effect to prevent the event from propagating
    useEffect(() => {
        const handleIntentWarningKeyDown = (e) => {
            if (showIntentWarning && e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.stopPropagation(); // Add this to stop event propagation
                
                // Set a flag to prevent immediate reopening
                const currentInput = scriptChatInput;
                setShowIntentWarning(false);
                
                const sendMessageAnyway = async () => {
                    const messageContent = selectedCodeAttachment ? 
                        `\`\`\`html\n${selectedCodeAttachment}\n\`\`\`\n\n${currentInput}` : 
                        currentInput;
                    
                    setScriptChatMessages(prev => [...prev, { role: 'user', content: messageContent }]);
                    setScriptChatInput('');
                    setSelectedCodeAttachment(null);
                    setIsTyping(true);

                    try {
                        // Construct the prompt 
                        const usersPrompt = selectedCodeAttachment ?
                                `The user has selected this section of the code to focus on:\n\`\`\`html\n${selectedCodeAttachment}\n\`\`\`\n\nThe user has also provided the following instructions:\n${currentInput}`
                            : 
                            currentInput;
                        
                        const response = await updaterAgent(usersPrompt, code, modelPreferences.programmerModel, false);

                        // Log the response in yellow
                        console.log('\x1b[33m%s\x1b[0m', response);

                        if (response) {
                            // Add current state to history before updating
                            const newHistory = editHistory.slice(0, historyIndex + 1);
                            newHistory.push({ content: response });
                            setEditHistory(newHistory);
                            setHistoryIndex(newHistory.length - 1);
                            
                            // Update the code
                            setCode(response);
                            setPreviewKey(prev => prev + 1);

                            // Add a message indicating task completion
                            setScriptChatMessages(prev => [...prev, { 
                                role: 'assistant', 
                                content: 'Task completed', 
                                fullScript: response 
                            }]);
                        } else {
                            setScriptChatMessages(prev => [...prev, { 
                                role: 'assistant', 
                                content: response 
                            }]);
                        }
                    } catch (error) {
                        console.error('Error in chat:', error);
                        setScriptChatMessages(prev => [...prev, { 
                            role: 'assistant', 
                            content: 'Sorry, there was an error processing your request.' 
                        }]);
                    }

                    setIsTyping(false);
                };
                sendMessageAnyway();
            }
        };

        document.addEventListener('keydown', handleIntentWarningKeyDown, true); // Add capture phase
        return () => {
            document.removeEventListener('keydown', handleIntentWarningKeyDown, true);
        };
    }, [showIntentWarning, scriptChatInput, selectedCodeAttachment, code, modelPreferences.programmerModel, editHistory, historyIndex]);

    return (
        <div style={styles.container}>
            <motion.div 
                style={styles.header}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
            >
                <div style={styles.headerLeft}>
                    <Tooltip title="Back">
                        <IconButton
                            onClick={handleClose}
                            sx={styles.iconButton}
                        >
                            <FaArrowLeft />
                        </IconButton>
                    </Tooltip>
                    <div style={styles.titleContainer}>
                        <h3 style={styles.title}>{script.name}</h3>
                        <span style={styles.scriptType}>{script.scriptType === 'webApps' ? 'Web App' : 'OpenSCAD'}</span>
                    </div>
                </div>
                <div style={styles.actions}>
                    <Tooltip title="Chat">
                        <IconButton
                            onClick={() => setShowScriptChat(prev => !prev)}
                            sx={{
                                ...styles.iconButton,
                                color: showScriptChat ? darkModeColors.primary : darkModeColors.text,
                            }}
                        >
                            <FaComments size={16} />
                        </IconButton>
                    </Tooltip>
                    <div style={styles.divider} />
                    <Tooltip title="Run">
                        <IconButton
                            onClick={handleRunPreview}
                            sx={styles.iconButton}
                        >
                            <FaPlay size={16} />
                        </IconButton>
                    </Tooltip>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        sx={styles.saveButton}
                        size={isMobile ? "small" : "medium"}
                    >
                        Save
                    </Button>
                </div>
            </motion.div>
            <div 
                ref={containerRef}
                style={{
                    ...styles.content,
                    flexDirection: isMobile ? 'column' : 'row',
                }}
            >
                <motion.div
                    style={styles.editorPane}
                    animate={{
                        width: isMobile ? '100%' : 
                            isMaximized === 'editor' ? '100%' :
                            isMaximized === 'preview' ? '0%' :
                            `${splitPosition}%`,
                        height: isMobile ? 
                            (isMaximized === 'editor' ? '100%' :
                            isMaximized === 'preview' ? '0%' :
                            `${splitPosition}%`) : '100%'
                    }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                >
                    <div style={styles.paneHeader}>
                        <span style={styles.paneTitle}>Editor</span>
                        <div style={styles.paneActions}>
                            <Tooltip title="Undo">
                                <IconButton
                                    onClick={handleUndo}
                                    disabled={historyIndex === 0}
                                    sx={styles.iconButton}
                                >
                                    <FaUndo size={12} color={historyIndex === 0 ? darkModeColors.textSecondary : darkModeColors.text} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Redo">
                                <IconButton
                                    onClick={handleRedo}
                                    disabled={historyIndex === editHistory.length - 1}
                                    sx={styles.iconButton}
                                >
                                    <FaRedo size={12} color={historyIndex === editHistory.length - 1 ? darkModeColors.textSecondary : darkModeColors.text} />
                                </IconButton>
                            </Tooltip>
                            <div style={styles.divider} />
                            <div style={styles.searchContainer}>
                                <SearchOverlay 
                                    visible={searchVisible}
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    onSearch={handleSearch}
                                    onClose={() => {
                                        setSearchVisible(false);
                                        setSearchTerm('');
                                    }}
                                    searchResults={searchResults}
                                    isMobile={isMobile}
                                />
                                <Tooltip title={searchVisible ? "Close Search" : "Search"}>
                                    <IconButton
                                        onClick={() => setSearchVisible(!searchVisible)}
                                        sx={{
                                            ...styles.iconButton,
                                            color: searchVisible ? darkModeColors.primary : darkModeColors.text,
                                        }}
                                    >
                                        <FaSearch size={12} />
                                    </IconButton>
                                </Tooltip>
                            </div>
                            <Tooltip title="Toggle Word Wrap">
                                <IconButton
                                    onClick={() => setWrapEnabled(prev => !prev)}
                                    sx={{
                                        ...styles.iconButton,
                                        color: wrapEnabled ? darkModeColors.primary : darkModeColors.text,
                                    }}
                                >
                                    <FaAlignLeft size={12} />
                                </IconButton>
                            </Tooltip>
                            <div style={styles.divider} />
                            <Tooltip title={isMaximized === 'editor' ? 'Restore' : 'Maximize'}>
                                <IconButton
                                    onClick={() => toggleMaximize('editor')}
                                    sx={styles.iconButton}
                                >
                                    {isMaximized === 'editor' ? <FaCompress size={12} /> : <FaExpand size={12} />}
                                </IconButton>
                            </Tooltip>
                        </div>
                    </div>
                    <div style={styles.viewToggle}>
                        <Tooltip title="Code View">
                            <IconButton
                                onClick={() => setViewMode('code')}
                                sx={{
                                    ...styles.iconButton,
                                    backgroundColor: viewMode === 'code' ? `${darkModeColors.primary}20` : 'transparent',
                                    color: viewMode === 'code' ? darkModeColors.primary : darkModeColors.text,
                                }}
                            >
                                <FaCode size={16} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="DOM Tree View">
                            <IconButton
                                onClick={() => setViewMode('tree')}
                                sx={{
                                    ...styles.iconButton,
                                    backgroundColor: viewMode === 'tree' ? `${darkModeColors.primary}20` : 'transparent',
                                    color: viewMode === 'tree' ? darkModeColors.primary : darkModeColors.text,
                                }}
                            >
                                <FaProjectDiagram size={16} />
                            </IconButton>
                        </Tooltip>
                    </div>
                    <div style={{ height: 'calc(100% - 40px)' }}>
                        {viewMode === 'code' ? (
                            <AceEditor
                                ref={editorRef}
                                mode="javascript"
                                theme="monokai"
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
                                }}
                                onSelectionChange={handleEditorSelection}
                            />
                        ) : (
                            <DOMTreeViewer 
                                htmlContent={code}
                                onNodeClick={onNodeClick}
                                onNodeUpdate={handleNodeUpdate}
                                showScriptChat={showScriptChat}
                                setShowScriptChat={setShowScriptChat}
                                setSelectedCodeAttachment={setSelectedCodeAttachment}
                            />
                        )}
                    </div>
                </motion.div>

                <motion.div
                    style={styles.previewPane}
                    animate={{
                        width: isMobile ? '100%' : 
                            isMaximized === 'preview' ? '100%' :
                            isMaximized === 'editor' ? '0%' :
                            `${100 - splitPosition}%`,
                        height: isMobile ? 
                            (isMaximized === 'preview' ? '100%' :
                            isMaximized === 'editor' ? '0%' :
                            `${100 - splitPosition}%`) : '100%'
                    }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                >
                    <div style={styles.paneHeader}>
                        <span style={styles.paneTitle}>Preview</span>
                        <div style={styles.paneActions}>
                            {isMaximized === 'preview' && (
                                <>
                                    <Tooltip title="Undo">
                                        <IconButton
                                            onClick={handleUndo}
                                            disabled={historyIndex === 0}
                                            sx={styles.iconButton}
                                        >
                                            <FaUndo size={12} color={historyIndex === 0 ? darkModeColors.textSecondary : darkModeColors.text} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Redo">
                                        <IconButton
                                            onClick={handleRedo}
                                            disabled={historyIndex === editHistory.length - 1}
                                            sx={styles.iconButton}
                                        >
                                            <FaRedo size={12} color={historyIndex === editHistory.length - 1 ? darkModeColors.textSecondary : darkModeColors.text} />
                                        </IconButton>
                                    </Tooltip>
                                    <div style={styles.divider} />
                                </>
                            )}
                            <button
                                onClick={() => toggleMaximize('preview')}
                                style={styles.showEditorButton}
                            >
                                {isMaximized === 'preview' ? (
                                    <>
                                        <span style={styles.showEditorText}>Show Editor</span>
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
                        style={styles.preview}
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
                        style={styles.savingOverlay}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            style={styles.savingContent}
                        >
                            <LoadingSpinner size={50} inline={true} />
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                style={styles.savingText}
                            >
                                Saving changes...
                            </motion.p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Toast 
                message={toastMessage}
                isVisible={showToast}
                onHide={() => setShowToast(false)}
                type={toastType}
            />

            <AnimatePresence>
                {showScriptChat && (
                    <motion.div
                        ref={dragRef}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            ...styles.scriptChatContainer,
                            width: `${scriptChatSize.width}px`,
                            height: `${scriptChatSize.height}px`,
                            left: scriptChatPosition.x !== null ? `${scriptChatPosition.x}px` : 'auto',
                            top: scriptChatPosition.y !== null ? `${scriptChatPosition.y}px` : '90px',
                            cursor: 'move',
                        }}
                        onMouseDown={handleDragStart}
                    >
                        <div style={styles.scriptChatHeader}>
                            <span style={styles.scriptChatTitle}>Programmer Agent</span>
                            <IconButton
                                onClick={() => setShowScriptChat(false)}
                                sx={styles.iconButton}
                            >
                                <FaTimes size={16} />
                            </IconButton>
                        </div>
                        <div style={styles.scriptChatMessages}>
                            {scriptChatMessages.map((msg, index) => (
                                <div 
                                    key={index} 
                                    style={{
                                        ...msg.role === 'user' ? styles.userMessage : styles.assistantMessage,
                                        position: 'relative',
                                        cursor: 'pointer',
                                        filter: scriptChatActionOverlay?.index === index ? 'blur(2px)' : 'none',
                                        transition: 'filter 0.2s ease'
                                    }}
                                    onClick={(e) => handleScriptChatBubbleClick(e, index, msg.role)}
                                >
                                    {msg.role === 'user' ? (
                                        <>
                                            {msg.content.includes('```html') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCodeViewerOverlay(msg.content);
                                                    }}
                                                    style={styles.viewCodeButton}
                                                >
                                                    View Code
                                                </button>
                                            )}
                                            <div style={styles.messageText}>
                                                {/* Only show the user's message, not the history */}
                                                {msg.content.split('```')[2]?.split('\n\n')[1] || 
                                                 msg.content.split('\nPrevious commands:')[0]}
                                            </div>
                                            {msg.timestamp && (
                                                <div style={styles.messageTimestamp}>
                                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <ReactMarkdown
                                                children={msg.content}
                                                components={{
                                                    code({node, inline, className, children, ...props}) {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        return !inline && match ? (
                                                            <SyntaxHighlighter
                                                                style={vscDarkPlus}
                                                                language={match[1]}
                                                                PreTag="div"
                                                                {...props}
                                                            >
                                                                {String(children).replace(/\n$/, '')}
                                                            </SyntaxHighlighter>
                                                        ) : (
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    },
                                                }}
                                            />
                                            {msg.fullScript && (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(msg.fullScript);
                                                        setScriptChatCopied(true);
                                                        setTimeout(() => setScriptChatCopied(false), 2000);
                                                    }}
                                                    style={styles.copyFullScriptButton}
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
                                        style={styles.codeViewerOverlay}
                                        onClick={() => setCodeViewerOverlay(null)}
                                    >
                                        <motion.div
                                            initial={{ scale: 0.95 }}
                                            animate={{ scale: 1 }}
                                            exit={{ scale: 0.95 }}
                                            style={styles.codeViewerContent}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div style={styles.codeViewerBody}>
                                                {/* Extract and display only the code snippet */}
                                                <SyntaxHighlighter
                                                    style={vscDarkPlus}
                                                    language="html"
                                                    PreTag="div"
                                                >
                                                    {codeViewerOverlay.split('```html\n')[1].split('```')[0].trim()}
                                                </SyntaxHighlighter>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigator.clipboard.writeText(
                                                            codeViewerOverlay.split('```html\n')[1].split('```')[0].trim()
                                                        );
                                                        setScriptChatCopied(true);
                                                        setTimeout(() => setScriptChatCopied(false), 2000);
                                                        setCodeViewerOverlay(null);
                                                    }}
                                                    style={styles.codeViewerCopyButton}
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
                                    className="scriptChatActionOverlay"
                                    style={{
                                        ...styles.scriptChatActionOverlay,
                                        position: 'fixed',
                                        left: scriptChatActionOverlay.clientX,
                                        top: scriptChatActionOverlay.clientY,
                                        transform: 'translate(-50%, -50%)',
                                        zIndex: 1000,
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Show Copy option for user messages */}
                                    {scriptChatActionOverlay.role === 'user' && (
                                        <button 
                                            onClick={() => {
                                                const message = scriptChatMessages[scriptChatActionOverlay.index];
                                                const textToCopy = message.content.split('```')[2]?.split('\n\n')[1] || message.content;
                                                handleScriptChatCopy(textToCopy);
                                            }}
                                            style={styles.scriptChatActionButton}
                                        >
                                            Copy
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleScriptChatDelete(scriptChatActionOverlay.index)}
                                        style={{
                                            ...styles.scriptChatActionButton,
                                            color: '#ff4444',
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                            {scriptChatCopied && (
                                <div style={styles.copiedNotification}>
                                    Copied!
                                </div>
                            )}
                            {isTyping && (
                                <div className="typing-indicator">
                                    <div className="typing-dot" style={{ '--i': 0 }} />
                                    <div className="typing-dot" style={{ '--i': 1 }} />
                                    <div className="typing-dot" style={{ '--i': 2 }} />
                                </div>
                            )}
                            <div ref={scriptChatMessagesEndRef} />
                        </div>
                        <div style={styles.scriptChatInputContainer}>
                            {selectedCodeAttachment && (
                                <div style={styles.codeAttachmentPreview}>
                                    <pre style={styles.codePreview}>
                                        {selectedCodeAttachment.length > 100 
                                            ? selectedCodeAttachment.substring(0, 100) + '...' 
                                            : selectedCodeAttachment}
                                    </pre>
                                    <FaTimes 
                                        className="RemoveCode" 
                                        style={styles.removeCodeButton}
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
                                    if (isMobileRef.current) {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const newValue = scriptChatInput + '\n';
                                            setScriptChatInput(newValue);
                                            setTimeout(() => adjustTextareaHeight(e.target), 0);
                                        }
                                    } else {
                                        if (e.key === 'Enter') {
                                            if (e.shiftKey) {
                                                e.preventDefault();
                                                const newValue = scriptChatInput + '\n';
                                                setScriptChatInput(newValue);
                                                setTimeout(() => adjustTextareaHeight(e.target), 0);
                                            } else {
                                                e.preventDefault();
                                                handleScriptChatSend();
                                            }
                                        }
                                    }
                                }}
                                placeholder="Send a command..."
                                style={styles.scriptChatInput}
                            />
                            <button 
                                onClick={handleScriptChatSend}
                                style={styles.scriptChatSendButton}
                            >
                                Send
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add the intent warning overlay */}
            <AnimatePresence>
                {showIntentWarning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.intentWarningOverlay}
                        onClick={() => setShowIntentWarning(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            style={styles.intentWarningContent}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p style={styles.intentWarningText}>
                                The Programmer Agent is designed for executing commands and tasks related to your app, not for general chatting. Your intent confidence is {Math.round(intentConfidence * 100)}%.
                            </p>
                            <div style={styles.intentWarningActions}>
                                <button 
                                    onClick={() => setShowIntentWarning(false)}
                                    style={styles.intentWarningButton}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        setShowIntentWarning(false);
                                        const sendMessageAnyway = async () => {
                                            const messageContent = selectedCodeAttachment ? 
                                                `\`\`\`html\n${selectedCodeAttachment}\n\`\`\`\n\n${scriptChatInput}` : 
                                                scriptChatInput;
                                            
                                            setScriptChatMessages(prev => [...prev, { role: 'user', content: messageContent }]);
                                            setScriptChatInput('');
                                            setSelectedCodeAttachment(null);
                                            setIsTyping(true);

                                            try {
                                                // Construct the prompt 
                                                const usersPrompt = selectedCodeAttachment ?
                                                        `The user has selected this section of the code to focus on:\n\`\`\`html\n${selectedCodeAttachment}\n\`\`\`\n\nThe user has also provided the following instructions:\n${scriptChatInput}`
                                                    : 
                                                    scriptChatInput;
                                                
                                                const response = await updaterAgent(usersPrompt, code, modelPreferences.programmerModel, false);

                                                // Log the response in yellow
                                                console.log('\x1b[33m%s\x1b[0m', response);

                                                if (response) {
                                                    // Add current state to history before updating
                                                    const newHistory = editHistory.slice(0, historyIndex + 1);
                                                    newHistory.push({ content: response });
                                                    setEditHistory(newHistory);
                                                    setHistoryIndex(newHistory.length - 1);
                                                    
                                                    // Update the code
                                                    setCode(response);
                                                    setPreviewKey(prev => prev + 1);

                                                    // Add a message indicating task completion
                                                    setScriptChatMessages(prev => [...prev, { 
                                                        role: 'assistant', 
                                                        content: 'Task completed', 
                                                        fullScript: response 
                                                    }]);
                                                } else {
                                                    setScriptChatMessages(prev => [...prev, { 
                                                        role: 'assistant', 
                                                        content: response 
                                                    }]);
                                                }
                                            } catch (error) {
                                                console.error('Error in chat:', error);
                                                setScriptChatMessages(prev => [...prev, { 
                                                    role: 'assistant', 
                                                    content: 'Sorry, there was an error processing your request.' 
                                                }]);
                                            }

                                            setIsTyping(false);
                                        };
                                        sendMessageAnyway();
                                    }}
                                    style={styles.intentWarningButton}
                                >
                                    Send Anyways (Enter)
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showUnsavedChanges && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={styles.unsavedOverlay}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: "spring", damping: 20 }}
                            style={styles.unsavedContent}
                        >
                            <h3 style={styles.unsavedTitle}>Unsaved Changes</h3>
                            <p style={styles.unsavedText}>
                                You have unsaved changes. Would you like to save before closing?
                            </p>
                            <div style={styles.unsavedActions}>
                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: `${darkModeColors.hover}CC` }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowUnsavedChanges(false)}
                                    style={styles.unsavedSecondaryButton}
                                >
                                    Cancel
                                </motion.button>
                                <div style={styles.unsavedPrimaryActions}>
                                    <motion.button
                                        whileHover={{ scale: 1.02, backgroundColor: `${darkModeColors.danger}15` }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={async () => {
                                            await closeEditor();
                                        }}
                                        style={styles.unsavedDangerButton}
                                    >
                                        Don't Save
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.02, backgroundColor: darkModeColors.secondary }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={async () => {
                                            await handleSave();
                                            await closeEditor();
                                        }}
                                        style={styles.unsavedPrimaryButton}
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
                    style={styles.loadingOverlay}
                >
                    <FullScreenSpinner text="Cleaning up" />
                </motion.div>
            )}
        </div>
    );
};

const styles = {
    container: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: darkModeColors.background,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        backgroundColor: darkModeColors.headerBackground,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${darkModeColors.border}`,
        height: '64px',
        '@media (max-width: 768px)': {
            padding: '0 8px',
            height: '56px',
        },
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flex: 1,
        minWidth: 0, // Allows flex items to shrink below content size
        '@media (max-width: 768px)': {
            gap: '8px',
        },
    },
    titleContainer: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0, // Allows container to shrink
        flex: 1,
    },
    title: {
        color: darkModeColors.text,
        margin: 0,
        fontSize: '16px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        '@media (max-width: 768px)': {
            fontSize: '14px',
        },
    },
    scriptType: {
        color: darkModeColors.textSecondary,
        fontSize: '12px',
        '@media (max-width: 768px)': {
            fontSize: '11px',
        },
    },
    actions: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        '@media (max-width: 768px)': {
            gap: '4px',
        },
    },
    iconButton: {
        color: darkModeColors.text,
        padding: '8px',
        borderRadius: '8px',
        '&:hover': {
            backgroundColor: `${darkModeColors.hover}80`,
        },
        '@media (max-width: 768px)': {
            padding: '6px',
        },
    },
    saveButton: {
        backgroundColor: darkModeColors.primary,
        textTransform: 'none',
        fontWeight: 500,
        borderRadius: '8px',
        padding: '6px 16px',
        '&:hover': {
            backgroundColor: darkModeColors.secondary,
        },
        '@media (max-width: 768px)': {
            padding: '4px 12px',
            minWidth: 'unset',
        },
    },
    content: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        backgroundColor: darkModeColors.background,
    },
    paneHeader: {
        height: '40px',
        backgroundColor: darkModeColors.foreground,
        borderBottom: `1px solid ${darkModeColors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
    },
    paneTitle: {
        color: darkModeColors.textSecondary,
        fontSize: '13px',
        fontWeight: 500,
    },
    editorPane: {
        backgroundColor: darkModeColors.background,
        overflow: 'hidden',
        position: 'relative',
    },
    previewPane: {
        backgroundColor: darkModeColors.background,
        overflow: 'hidden',
        position: 'relative',
    },
    preview: {
        width: '100%',
        height: 'calc(100% - 40px)',
        border: 'none',
        backgroundColor: 'white',
    },
    dragHandle: {
        position: 'relative',
        width: '4px',
        backgroundColor: darkModeColors.border,
        transition: 'all 0.2s ease',
        '&:hover': {
            backgroundColor: darkModeColors.primary,
        },
        '@media (max-width: 768px)': {
            width: '100%',
            height: '4px',
        },
    },
    dragHandleActive: {
        backgroundColor: darkModeColors.primary,
    },
    searchContainer: {
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
    },
    searchInputContainer: {
        position: 'relative',
        overflow: 'hidden',
        marginRight: '4px',
    },
    searchInput: {
        backgroundColor: darkModeColors.inputBackground,
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '6px',
        padding: '6px 12px',
        color: darkModeColors.text,
        fontSize: '14px',
        width: '100%',
        outline: 'none',
        transition: 'all 0.2s ease',
        '&:focus': {
            borderColor: darkModeColors.primary,
            boxShadow: `0 0 0 2px ${darkModeColors.primary}20`,
        },
        '@media (max-width: 768px)': {
            padding: '4px 8px',
            fontSize: '13px',
        },
    },
    divider: {
        width: '1px',
        height: '24px',
        backgroundColor: darkModeColors.border,
        margin: '0 8px',
    },
    searchOverlayBackdrop: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        zIndex: 1200,
    },
    searchOverlayContainer: {
        position: 'fixed',
        top: 16,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        zIndex: 1201,
        padding: '0 16px',
    },
    searchOverlay: {
        backgroundColor: darkModeColors.foreground,
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        gap: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
        border: `1px solid ${darkModeColors.border}`,
        maxWidth: '600px',
        width: '100%',
        '@media (max-width: 768px)': {
            flexDirection: 'column',
            gap: '8px',
        },
    },
    searchInputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        flex: 1,
        minWidth: 0,
    },
    searchIconWrapper: {
        position: 'absolute',
        left: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: darkModeColors.textSecondary,
    },
    searchInput: {
        backgroundColor: darkModeColors.inputBackground,
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '8px',
        padding: '8px 12px 8px 36px',
        color: darkModeColors.text,
        fontSize: '14px',
        width: '100%',
        outline: 'none',
        transition: 'all 0.2s ease',
        '&:focus': {
            borderColor: darkModeColors.primary,
            boxShadow: `0 0 0 2px ${darkModeColors.primary}20`,
        },
    },
    searchCountWrapper: {
        position: 'absolute',
        right: '12px',
        backgroundColor: `${darkModeColors.primary}20`,
        padding: '2px 8px',
        borderRadius: '12px',
    },
    searchCount: {
        color: darkModeColors.primary,
        fontSize: '12px',
        fontWeight: '500',
        userSelect: 'none',
    },
    searchActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        '@media (max-width: 768px)': {
            justifyContent: 'flex-end',
        },
    },
    searchButton: {
        color: darkModeColors.text,
        padding: '8px',
        borderRadius: '8px',
        minWidth: '36px',
        height: '36px',
        '&:hover': {
            backgroundColor: `${darkModeColors.hover}80`,
        },
        '&.Mui-disabled': {
            color: `${darkModeColors.textSecondary}80`,
        },
    },
    searchDivider: {
        width: '1px',
        height: '24px',
        backgroundColor: darkModeColors.border,
        margin: '0 4px',
    },
    viewToggle: {
        position: 'absolute',
        right: '12px',
        top: '48px',
        display: 'flex',
        gap: '8px',
        padding: '8px',
        backgroundColor: darkModeColors.foreground,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        zIndex: 10,
    },
    savingOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(30, 31, 34, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    savingContent: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        backgroundColor: darkModeColors.foreground,
        padding: '24px 32px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
        border: `1px solid ${darkModeColors.border}`,
    },
    savingText: {
        color: darkModeColors.text,
        fontSize: '16px',
        fontWeight: 500,
        margin: 0,
    },
    scriptChatContainer: {
        position: 'fixed',
        backgroundColor: darkModeColors.foreground,
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
        border: `1px solid ${darkModeColors.border}`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        overflow: 'hidden',
        minWidth: '300px',
        minHeight: '300px',
        resize: 'both',
        '@media (max-width: 768px)': {
            width: 'calc(100% - 24px)',
            height: '50%',
            right: '12px',
            bottom: '12px',
            resize: 'none',
        },
    },
    scriptChatHeader: {
        padding: '12px 16px',
        borderBottom: `1px solid ${darkModeColors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scriptChatTitle: {
        color: darkModeColors.text,
        fontSize: '14px',
        fontWeight: 600,
    },
    scriptChatMessages: {
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    scriptChatInputContainer: {
        position: 'relative',  // Added to support absolute positioning of attachment
        padding: '12px',
        borderTop: `1px solid ${darkModeColors.border}`,
        display: 'flex',
        gap: '8px',
    },
    scriptChatInput: {
        flex: 1,
        backgroundColor: darkModeColors.background,
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '6px',
        padding: '8px 12px',
        color: darkModeColors.text,
        fontSize: '14px',
        lineHeight: '1.5',
        outline: 'none',
        resize: 'none',
        minHeight: '40px',
        maxHeight: '147px', // 6 rows * 21px + 16px padding
        overflowY: 'auto',
        transition: 'height 0.2s ease',
        '&:focus': {
            borderColor: darkModeColors.primary,
        },
    },
    scriptChatSendButton: {
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '6px',
        padding: '8px 16px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: darkModeColors.secondary,
        },
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        padding: '8px 12px',
        borderRadius: '12px 12px 0 12px',
        maxWidth: '80%',
        wordBreak: 'break-word',
        cursor: 'pointer', // Add this to show it's clickable
        transition: 'filter 0.2s ease', // Add this for smooth blur transition
    },
    assistantMessage: {
        alignSelf: 'flex-start',
        backgroundColor: darkModeColors.secondary,
        color: darkModeColors.text,
        padding: '8px 12px',
        borderRadius: '12px 12px 12px 0',
        maxWidth: '80%',
        wordBreak: 'break-word',
        cursor: 'pointer', // Add this to show it's clickable
        transition: 'filter 0.2s ease', // Add this for smooth blur transition
    },
    copiedNotification: {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 128, 0, 0.75)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '5px',
        zIndex: 1000,
    },
    paneActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    copyFullScriptButton: {
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'background-color 0.2s, transform 0.2s',
        marginTop: '8px',
        '&:hover': {
            backgroundColor: darkModeColors.secondary,
            transform: 'translateY(-2px)',
        },
        '&:active': {
            transform: 'translateY(0)',
        },
    },
    showEditorButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'transparent',
        border: 'none',
        color: darkModeColors.text,
        padding: '6px 12px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: `${darkModeColors.hover}80`,
        },
    },
    showEditorText: {
        color: darkModeColors.text,
        fontSize: '14px',
        fontWeight: 500,
    },
    codeAttachmentPreview: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '5px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0px 2px 5px rgba(0,0,0,0.5)',
        maxWidth: '90%',
        zIndex: 2,
        cursor: 'default',
        transition: 'all 0.3s ease',
        bottom: '100%',
        left: 0,
        marginBottom: '10px',
    },

    codePreview: {
        margin: 0,
        padding: '4px 8px',
        backgroundColor: darkModeColors.background,
        borderRadius: '4px',
        color: darkModeColors.text,
        fontSize: '12px',
        fontFamily: 'monospace',
        maxWidth: '100%',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
    },

    removeCodeButton: {
        color: darkModeColors.text,
        cursor: 'pointer',
        marginLeft: '8px',
        transition: 'color 0.2s ease',
        '&:hover': {
            color: '#ff5050',
        },
    },
    scriptChatActionOverlay: {
        backgroundColor: darkModeColors.foreground,
        borderRadius: '10px',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: 'auto',
        minWidth: '120px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        border: `1px solid ${darkModeColors.border}`,
        transition: 'transform 0.2s, opacity 0.2s',
        opacity: 1,
        pointerEvents: 'auto',
    },
    scriptChatActionButton: {
        backgroundColor: 'transparent',
        border: 'none',
        color: darkModeColors.text,
        padding: '8px 16px',
        cursor: 'pointer',
        borderRadius: '6px',
        transition: 'background-color 0.2s, transform 0.2s',
        fontSize: '14px',
        '&:hover': {
            backgroundColor: `${darkModeColors.hover}80`,
            transform: 'translateY(-2px)',
        },
    },
    copyCodeButton: {
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'background-color 0.2s, transform 0.2s',
        marginTop: '8px',
        '&:hover': {
            backgroundColor: darkModeColors.secondary,
            transform: 'translateY(-2px)',
        },
        '&:active': {
            transform: 'translateY(0)',
        },
    },
    codeBlockContainer: {
        position: 'relative',
        padding: '4px',
        borderRadius: '8px',
        backgroundColor: 'transparent',
    },
    copyIconOverlay: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '50%',
        padding: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
        },
    },
    copyIcon: {
        color: darkModeColors.text,
        fontSize: '14px',
    },
    viewCodeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '6px',
        padding: '8px 16px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'background-color 0.2s, transform 0.2s',
        marginBottom: '8px',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            transform: 'translateY(-1px)',
        },
    },
    messageText: {
        color: darkModeColors.text,
        fontSize: '14px',
        lineHeight: '1.5',
    },
    codeViewerOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        padding: '20px',
    },
    codeViewerContent: {
        backgroundColor: darkModeColors.foreground,
        borderRadius: '12px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '20px',
    },
    codeViewerBody: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    codeViewerCopyButton: {
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '8px',
        padding: '10px 20px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'background-color 0.2s, transform 0.2s',
        alignSelf: 'flex-end',
        '&:hover': {
            backgroundColor: darkModeColors.secondary,
            transform: 'translateY(-2px)',
        },
        '&:active': {
            transform: 'translateY(0)',
        },
    },
    intentWarningOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
        padding: '20px',
    },
    intentWarningContent: {
        backgroundColor: darkModeColors.foreground,
        borderRadius: '12px',
        width: '90%',
        maxWidth: '400px',
        padding: '20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
    },
    intentWarningText: {
        color: darkModeColors.text,
        fontSize: '16px',
        marginBottom: '20px',
    },
    intentWarningActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
    },
    intentWarningButton: {
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '6px',
        padding: '8px 16px',
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: darkModeColors.secondary,
        },
    },
    unsavedOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    unsavedContent: {
        backgroundColor: darkModeColors.foreground,
        borderRadius: '16px',
        padding: '28px',
        width: '90%',
        maxWidth: '420px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
        border: `1px solid ${darkModeColors.border}`,
    },
    unsavedTitle: {
        color: darkModeColors.text,
        margin: '0 0 12px 0',
        fontSize: '24px',
        fontWeight: '600',
        letterSpacing: '-0.02em',
    },
    unsavedText: {
        color: darkModeColors.textSecondary,
        margin: '0 0 28px 0',
        fontSize: '15px',
        lineHeight: '1.5',
        fontWeight: '400',
    },
    unsavedActions: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
    },
    unsavedPrimaryActions: {
        display: 'flex',
        gap: '12px',
    },
    unsavedSecondaryButton: {
        padding: '10px 16px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        backgroundColor: darkModeColors.hover,
        color: darkModeColors.text,
        transition: 'all 0.2s ease',
    },
    unsavedDangerButton: {
        padding: '10px 16px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        color: darkModeColors.danger,
        transition: 'all 0.2s ease',
    },
    unsavedPrimaryButton: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        transition: 'all 0.2s ease',
    },
    loadingOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(30, 31, 34, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000,
    },
    messageTimestamp: {
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: '4px',
        alignSelf: 'flex-end',
    },
};

export default FullScreenEditor;