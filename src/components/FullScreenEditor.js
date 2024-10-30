import React, { useState, useEffect, useRef, useCallback } from 'react';
import AceEditor from 'react-ace';
import { FaArrowLeft, FaPlay, FaCode, FaExpand, FaCompress, FaSearch, FaProjectDiagram, FaUndo, FaRedo, FaAlignLeft, FaComments, FaTimes } from 'react-icons/fa';
import { Button, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from './Toast';
import DOMTreeViewer from './DOMTreeViewer';
import { parseHTML, stringifyHTML } from '../utils/htmlParser';
import { saveScriptToFirestore, syncLocalScriptsWithFirestore, getModelPreferencesFromFirestore } from '../control/firebase'; // Changed from '../control/agent'
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from './LoadingSpinner';
import { promptLLM } from '../api/LLM';
import { htmlTemplate, htmlSystemTemplate } from '../ditto/templates/htmlTemplate';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
};

const useSplitPane = (isMobile, initialPosition = 50) => {
    const [splitPosition, setSplitPosition] = useState(initialPosition);
    const [isMaximized, setIsMaximized] = useState(null); // null, 'editor', or 'preview'
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
    const [scriptChatSize, setScriptChatSize] = useState({ width: 400, height: 500 });
    const [messageBoxHeight, setMessageBoxHeight] = useState(40);
    const resizingRef = useRef(null);
    const [scriptChatActionOverlay, setScriptChatActionOverlay] = useState(null);
    const [scriptChatCopied, setScriptChatCopied] = useState(false);

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

    const handleScriptChatSend = async () => {
        if (!scriptChatInput.trim()) return;
        const userMessage = scriptChatInput.trim();
        setScriptChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setScriptChatInput('');
        setIsTyping(true);

        try {
            const constructedPrompt = htmlTemplate(userMessage, code);
            const response = await promptLLM(constructedPrompt, htmlSystemTemplate(), modelPreferences.programmerModel);
            
            setScriptChatMessages(prev => [...prev, { role: 'assistant', content: response }]);

            // Extract code between ```html and ```
            const codeBlockRegex = /```html\n([\s\S]*?)```/;
            const match = response.match(codeBlockRegex);
            if (match) {
                const updatedCode = match[1].trim();
                
                // Add current state to history before updating
                const newHistory = editHistory.slice(0, historyIndex + 1);
                newHistory.push({ content: updatedCode });
                setEditHistory(newHistory);
                setHistoryIndex(newHistory.length - 1);
                
                // Update the code
                setCode(updatedCode);
                setPreviewKey(prev => prev + 1);
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

            setIsSaving(true); // Show loading overlay

            // Let the parent handle the save
            await onSave(code);

            setIsSaving(false); // Hide loading overlay
            setToastMessage('Changes saved successfully!');
            setToastType('success');
            setShowToast(true);
        } catch (error) {
            console.error('Error saving:', error);
            setIsSaving(false); // Hide loading overlay
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
        const userID = localStorage.getItem("userID");
        
        // Sync scripts before closing
        await syncLocalScriptsWithFirestore(userID, "webApps");
        await syncLocalScriptsWithFirestore(userID, "openSCAD");
        
        // Update localStorage with latest data
        const localWebApps = JSON.parse(localStorage.getItem("webApps")) || [];
        const localOpenSCAD = JSON.parse(localStorage.getItem("openSCAD")) || [];
        
        // Dispatch event to force scripts screen refresh
        window.dispatchEvent(new CustomEvent('scriptsUpdated', { 
            detail: { 
                webApps: localWebApps,
                openSCAD: localOpenSCAD
            }
        }));
        
        // Call the original onClose to return to scripts screen
        onClose();
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

    const handleResizeMouseDown = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.pageX;
        const startY = e.pageY;
        const startWidth = scriptChatSize.width;
        const startHeight = scriptChatSize.height;
        const startMessageHeight = messageBoxHeight;
        
        resizingRef.current = direction;

        const handleMouseMove = (e) => {
            if (!resizingRef.current) return;

            if (resizingRef.current === 'scriptChat') {
                // Calculate width from right edge (fixed) to mouse position
                const containerRect = containerRef.current.getBoundingClientRect();
                const rightEdge = containerRect.right - 12; // Account for padding
                const newWidth = Math.max(300, rightEdge - e.clientX);
                const newHeight = Math.max(300, Math.min(window.innerHeight - 100, startHeight + (e.pageY - startY)));
                
                setScriptChatSize({ 
                    width: newWidth, 
                    height: newHeight 
                });
            } else if (resizingRef.current === 'messageBox') {
                const newHeight = Math.max(40, Math.min(200, startMessageHeight + e.pageY - startY));
                setMessageBoxHeight(newHeight);
            }
        };

        const handleMouseUp = () => {
            resizingRef.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const adjustTextareaHeight = (textarea) => {
        if (!textarea) return;
        
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        
        // Calculate line height (assuming 14px font size and 1.5 line height)
        const lineHeight = 21; // 14px * 1.5
        const padding = 16; // 8px top + 8px bottom
        const maxHeight = lineHeight * 5 + padding; // 5 rows max
        
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
        setScriptChatMessages(prev => prev.filter((_, i) => i !== index));
        setScriptChatActionOverlay(null);
    };

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
                                <FaSearch size={16} />
                            </IconButton>
                        </Tooltip>
                    </div>
                    <div style={styles.divider} />
                    <Tooltip title="Undo">
                        <IconButton
                            onClick={handleUndo}
                            disabled={historyIndex === 0}
                            sx={styles.iconButton}
                        >
                            <FaUndo size={16} color={historyIndex === 0 ? darkModeColors.textSecondary : darkModeColors.text} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Redo">
                        <IconButton
                            onClick={handleRedo}
                            disabled={historyIndex === editHistory.length - 1}
                            sx={styles.iconButton}
                        >
                            <FaRedo size={16} color={historyIndex === editHistory.length - 1 ? darkModeColors.textSecondary : darkModeColors.text} />
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
                        <Tooltip title={isMaximized === 'editor' ? 'Restore' : 'Maximize'}>
                            <IconButton
                                onClick={() => toggleMaximize('editor')}
                                sx={styles.iconButton}
                            >
                                {isMaximized === 'editor' ? <FaCompress size={12} /> : <FaExpand size={12} />}
                            </IconButton>
                        </Tooltip>
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
                        <Tooltip title="Chat">
                            <IconButton
                                onClick={() => setShowScriptChat(prev => !prev)}
                                sx={{
                                    ...styles.iconButton,
                                    backgroundColor: showScriptChat ? `${darkModeColors.primary}20` : 'transparent',
                                    color: showScriptChat ? darkModeColors.primary : darkModeColors.text,
                                }}
                            >
                                <FaComments size={16} />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Toggle Word Wrap">
                            <IconButton
                                onClick={() => setWrapEnabled(prev => !prev)}
                                sx={{
                                    ...styles.iconButton,
                                    backgroundColor: wrapEnabled ? `${darkModeColors.primary}20` : 'transparent',
                                    color: wrapEnabled ? darkModeColors.primary : darkModeColors.text,
                                }}
                            >
                                <FaAlignLeft size={16} />
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
                            />
                        ) : (
                            <DOMTreeViewer 
                                htmlContent={code}
                                onNodeClick={onNodeClick}
                                onNodeUpdate={handleNodeUpdate}
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
                        <Tooltip title={isMaximized === 'preview' ? 'Restore' : 'Maximize'}>
                            <IconButton
                                onClick={() => toggleMaximize('preview')}
                                sx={styles.iconButton}
                            >
                                {isMaximized === 'preview' ? <FaCompress size={12} /> : <FaExpand size={12} />}
                            </IconButton>
                        </Tooltip>
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
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        style={{
                            ...styles.scriptChatContainer,
                            width: scriptChatSize.width,
                            height: scriptChatSize.height,
                        }}
                    >
                        <div style={styles.scriptChatHeader}>
                            <span style={styles.scriptChatTitle}>Script Chat</span>
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
                                </div>
                            ))}
                            {scriptChatActionOverlay && (
                                <div 
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
                                    <button 
                                        onClick={() => handleScriptChatCopy(scriptChatMessages[scriptChatActionOverlay.index].content)}
                                        style={styles.scriptChatActionButton}
                                    >
                                        Copy
                                    </button>
                                    <button 
                                        onClick={() => handleScriptChatDelete(scriptChatActionOverlay.index)}
                                        style={{
                                            ...styles.scriptChatActionButton,
                                            color: '#ff4444',
                                            borderTop: `1px solid ${darkModeColors.border}`
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
                            <div style={styles.textareaWrapper}>
                                <div
                                    style={styles.resizeHandle}
                                    onMouseDown={(e) => handleResizeMouseDown(e, 'messageBox')}
                                />
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
                                                // Use setTimeout to ensure the new value is set
                                                setTimeout(() => adjustTextareaHeight(e.target), 0);
                                            }
                                        } else {
                                            if (e.key === 'Enter') {
                                                if (e.shiftKey) {
                                                    e.preventDefault();
                                                    const newValue = scriptChatInput + '\n';
                                                    setScriptChatInput(newValue);
                                                    // Use setTimeout to ensure the new value is set
                                                    setTimeout(() => adjustTextareaHeight(e.target), 0);
                                                } else {
                                                    e.preventDefault();
                                                    handleScriptChatSend();
                                                }
                                            }
                                        }
                                    }}
                                    placeholder="Send a command..."
                                    style={{
                                        ...styles.scriptChatInput,
                                        minHeight: '40px', // Single line height
                                        height: 'auto', // Let the content determine the height
                                    }}
                                    rows={1}
                                />
                            </div>
                            <button 
                                onClick={handleScriptChatSend}
                                style={styles.scriptChatSendButton}
                            >
                                Send
                            </button>
                        </div>
                        <div 
                            style={styles.scriptChatResizeHandle}
                            onMouseDown={(e) => handleResizeMouseDown(e, 'scriptChat')}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
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
        position: 'absolute',
        top: '90px',
        right: '12px',
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
        '@media (max-width: 768px)': {
            width: 'calc(100% - 24px)',
            height: '400px',
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
    },
    assistantMessage: {
        alignSelf: 'flex-start',
        backgroundColor: darkModeColors.secondary,
        color: darkModeColors.text,
        padding: '8px 12px',
        borderRadius: '12px 12px 12px 0',
        maxWidth: '80%',
        wordBreak: 'break-word',
    },
    scriptChatResizeHandle: {
        position: 'absolute',
        left: 0,
        bottom: 0,
        width: '16px',
        height: '16px',
        cursor: 'nw-resize',
        backgroundColor: 'transparent',
        borderLeft: `3px solid ${darkModeColors.border}`,
        borderBottom: `3px solid ${darkModeColors.border}`,
        borderBottomLeftRadius: '8px',
        transition: 'border-color 0.2s',
        zIndex: 1,
        '&:hover': {
            borderColor: darkModeColors.primary,
            borderLeftWidth: '4px',
            borderBottomWidth: '4px',
        },
        '&:active': {
            borderColor: darkModeColors.primary,
            borderLeftWidth: '4px',
            borderBottomWidth: '4px',
        },
    },
    textareaWrapper: {
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
    },
    resizeHandle: {
        position: 'absolute',
        top: -3,
        left: 0,
        right: 0,
        height: '6px',
        cursor: 'ns-resize',
        backgroundColor: 'transparent',
        '&:hover': {
            backgroundColor: `${darkModeColors.primary}20`,
        },
        '&:active': {
            backgroundColor: `${darkModeColors.primary}40`,
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
    },
    scriptChatActionButton: {
        backgroundColor: 'transparent',
        border: 'none',
        color: darkModeColors.text,
        padding: '8px 16px',
        cursor: 'pointer',
        borderRadius: '6px',
        transition: 'background-color 0.2s ease',
        fontSize: '14px',
        '&:hover': {
            backgroundColor: `${darkModeColors.hover}80`,
        },
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
};

export default FullScreenEditor;