import React, { useState, useEffect, useRef, useCallback } from 'react';
import AceEditor from 'react-ace';
import { FaArrowLeft, FaPlay, FaCode, FaExpand, FaCompress } from 'react-icons/fa';
import { Button, useMediaQuery, IconButton, Tooltip } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

const darkModeColors = {
    background: '#1E1F22',
    foreground: '#2B2D31',
    primary: '#5865F2',
    secondary: '#4752C4',
    text: '#FFFFFF',
    textSecondary: '#B5BAC1',
    border: '#2B2D31',
    hover: '#32353B',
};

const useSplitPane = (isMobile, initialPosition = 50) => {
    const [splitPosition, setSplitPosition] = useState(initialPosition);
    const [isMaximized, setIsMaximized] = useState(null); // null, 'editor', or 'preview'
    const isDragging = useRef(false);
    const containerRef = useRef(null);

    const handleDragStart = useCallback((e) => {
        if (isMaximized) return;
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = isMobile ? 'row-resize' : 'col-resize';
        document.body.style.userSelect = 'none';
    }, [isMobile, isMaximized]);

    const handleDrag = useCallback((clientX, clientY) => {
        if (!isDragging.current || !containerRef.current) return;

        const container = containerRef.current.getBoundingClientRect();
        
        if (isMobile) {
            const offsetY = clientY - container.top;
            const percentage = (offsetY / container.height) * 100;
            setSplitPosition(Math.min(Math.max(percentage, 30), 70));
        } else {
            const offsetX = clientX - container.left;
            const percentage = (offsetX / container.width) * 100;
            setSplitPosition(Math.min(Math.max(percentage, 30), 70));
        }
    }, [isMobile]);

    const handleDragEnd = useCallback(() => {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => handleDrag(e.clientX, e.clientY);
        const handleTouchMove = (e) => {
            if (e.touches.length === 1) {
                handleDrag(e.touches[0].clientX, e.touches[0].clientY);
            }
        };

        if (isDragging.current) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleDragEnd);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleDragEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleDragEnd);
        };
    }, [handleDrag, handleDragEnd]);

    return {
        splitPosition,
        isMaximized,
        setIsMaximized,
        isDragging,
        containerRef,
        handleDragStart
    };
};

const FullScreenEditor = ({ script, onClose, onSave }) => {
    const [code, setCode] = useState(script.content);
    const [previewKey, setPreviewKey] = useState(0);
    const isMobile = useMediaQuery('(max-width: 768px)');

    const {
        splitPosition,
        isMaximized,
        setIsMaximized,
        isDragging,
        containerRef,
        handleDragStart
    } = useSplitPane(isMobile);

    const handleRunPreview = () => {
        setPreviewKey(prev => prev + 1);
    };

    const handleSave = () => {
        onSave(code);
    };

    const toggleMaximize = (pane) => {
        setIsMaximized(current => current === pane ? null : pane);
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
                    <h3 style={styles.title}>{script.name}</h3>
                </div>
                <div style={styles.actions}>
                    <Tooltip title="Run">
                        <IconButton
                            onClick={handleRunPreview}
                            sx={styles.iconButton}
                        >
                            <FaPlay />
                        </IconButton>
                    </Tooltip>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        sx={styles.saveButton}
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

                {!isMaximized && (
                    <div 
                        style={{
                            ...styles.dragHandle,
                            cursor: isMobile ? 'row-resize' : 'col-resize',
                            ...(isDragging.current && styles.dragHandleActive)
                        }}
                        onMouseDown={handleDragStart}
                        onTouchStart={handleDragStart}
                    />
                )}

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
        backgroundColor: darkModeColors.foreground,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${darkModeColors.border}`,
        height: '56px',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    title: {
        color: darkModeColors.text,
        margin: 0,
        fontSize: '16px',
        fontWeight: '500',
    },
    actions: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
    },
    iconButton: {
        color: darkModeColors.text,
        padding: '8px',
        '&:hover': {
            backgroundColor: darkModeColors.hover,
        },
    },
    saveButton: {
        backgroundColor: darkModeColors.primary,
        textTransform: 'none',
        fontWeight: 500,
        '&:hover': {
            backgroundColor: darkModeColors.secondary,
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
};

export default FullScreenEditor;