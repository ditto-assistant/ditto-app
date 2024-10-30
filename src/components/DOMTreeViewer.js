import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import AceEditor from 'react-ace';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton } from '@mui/material';
import { FaTimes, FaCheck } from 'react-icons/fa';

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
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
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
                        <FaCheck size={14} color={darkModeColors.primary} />
                    </IconButton>
                    <IconButton 
                        size="small" 
                        onClick={onClose}
                        style={styles.nodeEditorButton}
                    >
                        <FaTimes size={14} color={darkModeColors.textSecondary} />
                    </IconButton>
                </div>
            </div>
            <AceEditor
                mode="html"
                theme="monokai"
                onChange={setCode}
                value={code}
                name="node-editor"
                width="100%"
                height="200px"
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
        </motion.div>
    );
};

const DOMTreeViewer = ({ htmlContent, onNodeClick, onNodeUpdate }) => {
    const containerRef = useRef(null);
    const networkRef = useRef(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [editorPosition, setEditorPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!containerRef.current) return;

        const nodes = new DataSet();
        const edges = new DataSet();
        let nodeId = 1;

        const parseHTMLtoTree = (html) => {
            nodes.clear();
            edges.clear();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const traverse = (node, parentId) => {
                const currentId = nodeId++;
                nodes.add({ 
                    id: currentId, 
                    label: node.nodeName.toLowerCase(),
                    refNode: node,
                    color: {
                        background: darkModeColors.primary,
                        border: darkModeColors.secondary,
                        highlight: {
                            background: darkModeColors.secondary,
                            border: darkModeColors.primary
                        }
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
                const position = networkRef.current.getPositions([params.nodes[0]])[params.nodes[0]];
                const canvasPosition = networkRef.current.canvasToDOM(position);
                
                setEditorPosition({
                    x: canvasPosition.x,
                    y: canvasPosition.y
                });
                setSelectedNode(clickedNode.refNode);
                onNodeClick(clickedNode.refNode);
            } else {
                setSelectedNode(null);
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

        return () => {
            if (networkRef.current) {
                networkRef.current.destroy();
            }
            document.removeEventListener('touchmove', preventDefaultTouch);
            hammer.destroy();
        };
    }, [htmlContent, onNodeClick]);

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
            <AnimatePresence>
                {selectedNode && (
                    <div style={{
                        ...styles.editorWrapper,
                        left: editorPosition.x,
                        top: editorPosition.y
                    }}>
                        <NodeEditor
                            node={selectedNode}
                            onClose={() => setSelectedNode(null)}
                            onSave={handleSaveNodeEdit}
                        />
                    </div>
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
    },
    graph: {
        width: '100%',
        height: '100%',
        background: darkModeColors.background,
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '4px'
    },
    editorWrapper: {
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
    },
    nodeEditor: {
        backgroundColor: darkModeColors.foreground,
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
        border: `1px solid ${darkModeColors.border}`,
        width: '400px',
        overflow: 'hidden',
    },
    nodeEditorHeader: {
        padding: '12px',
        borderBottom: `1px solid ${darkModeColors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    nodeEditorTitle: {
        color: darkModeColors.text,
        fontSize: '14px',
        fontWeight: 500,
    },
    nodeEditorActions: {
        display: 'flex',
        gap: '8px',
    },
    nodeEditorButton: {
        padding: '4px',
        '&:hover': {
            backgroundColor: `${darkModeColors.hover}80`,
        },
    },
};

export default DOMTreeViewer; 