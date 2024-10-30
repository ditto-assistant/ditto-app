import React, { useState, useEffect, useRef, useCallback } from 'react';
import AceEditor from 'react-ace';
import { FaArrowLeft, FaPlay, FaCode, FaExpand, FaCompress, FaSearch, FaProjectDiagram } from 'react-icons/fa';
import { Button, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from './Toast';
import DOMTreeViewer from './DOMTreeViewer';
import { parseHTML, stringifyHTML } from '../utils/htmlParser';

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
    const [code, setCode] = useState(script.content);
    const [previewKey, setPreviewKey] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchVisible, setSearchVisible] = useState(false);
    const editorRef = useRef(null);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [showToast, setShowToast] = useState(false);
    const [searchResults, setSearchResults] = useState({ total: 0, current: 0 });
    const [viewMode, setViewMode] = useState('code'); // 'code' or 'tree'
    const [selectedNode, setSelectedNode] = useState(null);

    const {
        splitPosition,
        isMaximized,
        setIsMaximized,
        containerRef,
    } = useSplitPane(isMobile);

    // Add state to track editor initialization
    const [isEditorReady, setIsEditorReady] = useState(false);

    const handleRunPreview = () => {
        setPreviewKey(prev => prev + 1);
    };

    const handleSave = async () => {
        try {
            await onSave(code);
            setShowToast(true);
        } catch (error) {
            console.error('Error saving:', error);
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

    const handleNodeUpdate = useCallback((node, newCode) => {
        try {
            // Parse the new code
            const parser = new DOMParser();
            const doc = parser.parseFromString(newCode, 'text/html');
            const newNode = doc.body.firstChild;

            // Create a temporary container with the current code
            const tempDoc = parser.parseFromString(code, 'text/html');
            
            // Find and replace the corresponding node in the full document
            const oldNode = findCorrespondingNode(tempDoc, node);
            if (oldNode && newNode) {
                oldNode.replaceWith(newNode);
                
                // Update the full code
                setCode(tempDoc.documentElement.outerHTML);
            }
        } catch (error) {
            console.error('Error updating node:', error);
        }
    }, [code]);

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
                            onClick={onClose}
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
                                setOptions={{
                                    enableBasicAutocompletion: true,
                                    enableLiveAutocompletion: true,
                                    enableSnippets: true,
                                    showLineNumbers: true,
                                    tabSize: 2,
                                    useWorker: false,
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
            <Toast 
                message="Changes saved successfully!"
                isVisible={showToast}
                onHide={() => setShowToast(false)}
            />
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
        margin: '0 4px',
        '@media (max-width: 768px)': {
            height: '20px',
        },
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
};

export default FullScreenEditor;