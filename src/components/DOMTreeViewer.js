import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import AceEditor from 'react-ace';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton } from '@mui/material';
import { FaTimes, FaCheck } from 'react-icons/fa';
import { LoadingSpinner } from './LoadingSpinner';

const darkModeColors = {
    background: '#1E1F22',
    foreground: '#2B2D31',
    primary: '#5865F2',
    secondary: '#4752C4',
    text: '#FFFFFF',
    textSecondary: '#B5BAC1',
    border: '#1E1F22',
};

const NodeEditor = ({ node, onClose, onSave }) => {
    const [code, setCode] = useState(node.outerHTML);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={styles.nodeEditor}
        >
            <div style={styles.nodeEditorHeader}>
                <span style={styles.nodeEditorTitle}>{node.nodeName.toLowerCase()}</span>
                <div style={styles.nodeEditorActions}>
                    <IconButton 
                        size="small" 
                        onClick={() => onSave(code)}
                        style={styles.nodeEditorButton}
                    >
                        <FaCheck size={16} color={darkModeColors.primary} />
                    </IconButton>
                    <IconButton 
                        size="small" 
                        onClick={onClose}
                        style={styles.nodeEditorButton}
                    >
                        <FaTimes size={16} color={darkModeColors.textSecondary} />
                    </IconButton>
                </div>
            </div>
            <div style={styles.editorContainer}>
                <AceEditor
                    mode="html"
                    theme="monokai"
                    onChange={setCode}
                    value={code}
                    name="node-editor"
                    width="100%"
                    height="400px"
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
                    }}
                />
            </div>
        </motion.div>
    );
};

const DOMTreeViewer = ({ htmlContent, onNodeClick, onNodeUpdate }) => {
    const containerRef = useRef(null);
    const networkRef = useRef(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [editorPosition, setEditorPosition] = useState({ x: 0, y: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const stabilizationTimeout = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;
        
        setIsLoading(true);

        const nodes = new DataSet();
        const edges = new DataSet();
        let nodeId = 1;

        const parseHTMLtoTree = (html) => {
            nodes.clear();
            edges.clear();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const traverse = (node, parentId) => {
                if (node.nodeType !== 1) return;

                const currentId = nodeId++;
                
                // Get tag name and class names
                const tagName = node.nodeName.toLowerCase();
                const className = node.className && typeof node.className === 'string'
                    ? `.${node.className.trim().replace(/\s+/g, '.')}`
                    : '';
                
                // Create label with tag name and class names
                const label = `${tagName}${className}`;

                // Assign color based on tag name
                const tagColors = {
                    div: '#F39C12', // Orange
                    span: '#9B59B6', // Purple
                    p: '#2ECC71',    // Green
                    img: '#E74C3C',  // Red
                    a: '#3498DB',    // Blue
                    ul: '#1ABC9C',   // Teal
                    li: '#16A085',   // Dark Teal
                    // Add more tag colors as needed
                    default: darkModeColors.primary, // Fallback color
                };
                const nodeColor = tagColors[tagName] || tagColors.default;

                nodes.add({ 
                    id: currentId, 
                    label: label,
                    refNode: node,
                    color: {
                        background: nodeColor,
                        border: darkModeColors.secondary,
                        highlight: {
                            background: darkModeColors.secondary,
                            border: darkModeColors.primary
                        }
                    },
                    font: {
                        color: darkModeColors.text,
                        face: 'Inter, system-ui, sans-serif',
                    }
                });
                
                if (parentId !== null) {
                    edges.add({ 
                        from: parentId, 
                        to: currentId,
                        color: {
                            color: darkModeColors.textSecondary,
                            highlight: darkModeColors.text
                        }
                    });
                }

                node.childNodes.forEach(child => {
                    if (child.nodeType === 1) {
                        traverse(child, currentId);
                    }
                });
            };

            traverse(doc.body, null);
        };

        parseHTMLtoTree(htmlContent);

        const options = {
            nodes: {
                shape: 'dot',
                size: 30,
                font: {
                    size: 14,
                    color: darkModeColors.text,
                    face: 'Inter, system-ui, sans-serif'
                },
                borderWidth: 2,
                shadow: {
                    enabled: true,
                    color: 'rgba(0,0,0,0.2)',
                    size: 5
                },
                mass: 1
            },
            edges: {
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 0.5
                    }
                },
                smooth: {
                    enabled: true,
                    type: 'dynamic',
                    roundness: 0.5
                }
            },
            physics: {
                enabled: true,
                barnesHut: {
                    gravitationalConstant: -2000,
                    centralGravity: 0.3,
                    springLength: 95,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 0.1
                },
                stabilization: {
                    enabled: true,
                    iterations: 1000,
                    updateInterval: 100,
                    fit: true
                },
                timestep: 0.5,
                maxVelocity: 50,
                minVelocity: 0.1
            },
            interaction: {
                hover: true,
                zoomView: true,
                dragView: true,
                dragNodes: true,
                multiselect: false,
                selectConnectedEdges: false,
                keyboard: {
                    enabled: false
                },
                navigationButtons: false,
                tooltipDelay: 0,
            }
        };

        networkRef.current = new Network(containerRef.current, { nodes, edges }, options);

        networkRef.current.on('click', (params) => {
            if (params.nodes.length > 0) {
                const clickedNode = nodes.get(params.nodes[0]);
                setSelectedNode(clickedNode.refNode);
                onNodeClick(clickedNode.refNode);
            }
        });

        let isDragging = false;
        let draggedNode = null;

        networkRef.current.on('dragStart', (params) => {
            if (params.nodes.length > 0) {
                isDragging = true;
                draggedNode = params.nodes[0];
            }
        });

        networkRef.current.on('dragEnd', (params) => {
            if (isDragging && draggedNode) {
                const position = networkRef.current.getPositions([draggedNode])[draggedNode];
                
                const velocity = {
                    x: (Math.random() - 0.5) * 30,
                    y: (Math.random() - 0.5) * 30
                };

                networkRef.current.body.data.nodes.update([{
                    id: draggedNode,
                    x: position.x,
                    y: position.y,
                    vx: velocity.x,
                    vy: velocity.y
                }]);

                isDragging = false;
                draggedNode = null;
            }
        });

        const hammer = new window.Hammer(containerRef.current);
        hammer.get('pinch').set({ enable: true });

        let lastScale = 1;
        hammer.on('pinch', (ev) => {
            const delta = ev.scale / lastScale;
            lastScale = ev.scale;
            
            const rect = containerRef.current.getBoundingClientRect();
            const pinchCenter = {
                x: ev.center.x - rect.left,
                y: ev.center.y - rect.top
            };

            const networkPosition = networkRef.current.DOMtoCanvas(pinchCenter);
            
            networkRef.current.zoom(delta, {
                position: networkPosition,
                scale: networkRef.current.getScale() * delta
            });
        });

        hammer.on('pinchend', () => {
            lastScale = 1;
        });

        const preventDefaultTouch = (e) => {
            if (e.target.closest('.vis-network')) {
                e.stopPropagation();
            } else {
                e.preventDefault();
            }
        };

        document.addEventListener('touchmove', preventDefaultTouch, { passive: false });

        networkRef.current.on("stabilizationProgress", function(params) {
            setIsLoading(true);
            if (stabilizationTimeout.current) {
                clearTimeout(stabilizationTimeout.current);
            }
        });

        networkRef.current.on("stabilizationIterationsDone", function() {
            stabilizationTimeout.current = setTimeout(() => {
                setIsLoading(false);
            }, 500);
        });

        stabilizationTimeout.current = setTimeout(() => {
            setIsLoading(false);
        }, 3000);

        return () => {
            if (networkRef.current) {
                networkRef.current.destroy();
            }
            if (stabilizationTimeout.current) {
                clearTimeout(stabilizationTimeout.current);
            }
            document.removeEventListener('touchmove', preventDefaultTouch);
            hammer.destroy();
        };
    }, [htmlContent]);

    const handleSaveNodeEdit = (newCode) => {
        if (selectedNode && onNodeUpdate) {
            onNodeUpdate(selectedNode, newCode);
        }
        setSelectedNode(null);
    };

    return (
        <div style={styles.container}>
            <div 
                ref={containerRef} 
                style={styles.graph}
                className="vis-network"
            />
            {isLoading && (
                <div style={styles.loadingOverlay}>
                    <LoadingSpinner size={50} inline={true} />
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={styles.loadingText}
                    >
                        Building DOM Tree...
                    </motion.p>
                </div>
            )}
            <AnimatePresence>
                {selectedNode && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={styles.editorOverlay}
                            onClick={() => setSelectedNode(null)}
                        >
                            <motion.div 
                                style={styles.editorWrapper}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ type: "spring", damping: 20 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <NodeEditor
                                    node={selectedNode}
                                    onClose={() => setSelectedNode(null)}
                                    onSave={handleSaveNodeEdit}
                                />
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

const styles = {
    container: {
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    graph: {
        width: '100%',
        height: '100%',
        background: darkModeColors.background,
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '4px',
        position: 'relative',
    },
    editorOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editorWrapper: {
        zIndex: 1000,
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80%',
        display: 'flex',
        flexDirection: 'column',
        '@media (max-width: 768px)': {
            width: '95%',
            maxWidth: 'none',
            margin: '0',
        },
        '@media (max-height: 600px)': {
            maxHeight: '90%',
        },
    },
    nodeEditor: {
        backgroundColor: darkModeColors.foreground,
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
        border: `1px solid ${darkModeColors.border}`,
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
    },
    nodeEditorHeader: {
        padding: '16px',
        borderBottom: `1px solid ${darkModeColors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: darkModeColors.foreground,
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px',
    },
    nodeEditorTitle: {
        color: darkModeColors.text,
        fontSize: '16px',
        fontWeight: 600,
    },
    nodeEditorActions: {
        display: 'flex',
        gap: '8px',
    },
    nodeEditorButton: {
        padding: '8px',
        borderRadius: '8px',
        transition: 'all 0.2s ease',
        '&:hover': {
            backgroundColor: `${darkModeColors.hover}80`,
            transform: 'scale(1.05)',
        },
        '&:active': {
            transform: 'scale(0.95)',
        },
    },
    editorContainer: {
        flex: 1,
        minHeight: 0,
        maxHeight: 'calc(100% - 60px)',
        overflow: 'auto',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(30, 31, 34, 0.8)',
        zIndex: 100,
        backdropFilter: 'blur(4px)',
        borderRadius: '4px',
    },
    loadingText: {
        color: darkModeColors.text,
        marginTop: '16px',
        fontSize: '14px',
        fontWeight: 500,
    },
};

export default DOMTreeViewer; 