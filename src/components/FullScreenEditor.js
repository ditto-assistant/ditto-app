import React, { useState, useEffect, useRef, useCallback } from 'react';
import AceEditor from 'react-ace';
import { FaArrowLeft, FaPlay, FaCode, FaExpand, FaCompress, FaSearch } from 'react-icons/fa';
import { Button, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Toast from './Toast';

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

const FullScreenEditor = ({ script, onClose, onSave }) => {
    const [code, setCode] = useState(script.content);
    const [previewKey, setPreviewKey] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchVisible, setSearchVisible] = useState(false);
    const editorRef = useRef(null);
    const isMobile = useMediaQuery('(max-width: 768px)');
    const [showToast, setShowToast] = useState(false);

    const {
        splitPosition,
        isMaximized,
        setIsMaximized,
        containerRef,
    } = useSplitPane(isMobile);

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

    const handleSearch = (searchTerm) => {
        if (!editorRef.current) return;
        
        const editor = editorRef.current.editor;
        editor.find(searchTerm, {
            backwards: false,
            wrap: true,
            caseSensitive: false,
            wholeWord: false,
            regExp: false
        });
    };

    useEffect(() => {
        if (searchTerm) {
            handleSearch(searchTerm);
        }
    }, [searchTerm]);

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
                        <AnimatePresence>
                            {searchVisible && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: isMobile ? 150 : 200, opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    style={styles.searchInputContainer}
                                >
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={styles.searchInput}
                                        autoFocus
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
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
                    <AceEditor
                        ref={editorRef}
                        mode="javascript"
                        theme="monokai"
                        onChange={setCode}
                        value={code}
                        name="full-screen-editor"
                        width="100%"
                        height="calc(100% - 40px)"
                        fontSize={14}
                        showPrintMargin={false}
                        showGutter={true}
                        highlightActiveLine={true}
                        setOptions={{
                            enableBasicAutocompletion: true,
                            enableLiveAutocompletion: true,
                            enableSnippets: true,
                            showLineNumbers: true,
                            tabSize: 2,
                            useWorker: false,
                        }}
                    />
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
};

export default FullScreenEditor;