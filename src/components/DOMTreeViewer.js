import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import AceEditor from 'react-ace';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton } from '@mui/material';
import { FaTimes, FaCheck, FaComments, FaUndo, FaRedo, FaHistory } from 'react-icons/fa';
import { LoadingSpinner } from './LoadingSpinner';
import { promptLLM } from '../api/LLM';
import { getModelPreferencesFromFirestore } from '../control/firebase';
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
};

const typingIndicatorCSS = `
.typing-indicator {
    display: flex;
    align-items: center;
    padding: 0 8px;
    height: 20px;
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

const NodeEditor = ({ node, onClose, onSave, htmlContent, updateHtmlContent }) => {
    const [code, setCode] = useState(node.outerHTML);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [modelPreferences, setModelPreferences] = useState({ programmerModel: 'claude-3-5-sonnet' });
    const userID = localStorage.getItem('userID');
    const [showChat, setShowChat] = useState(false);
    const messagesEndRef = useRef(null);
    const [isTyping, setIsTyping] = useState(false);
    const [codeBase, setCodeBase] = useState(htmlContent);

    useEffect(() => {
        // Fetch user's preferred programmer model
        getModelPreferencesFromFirestore(userID).then(prefs => {
            setModelPreferences(prefs);
        });
    }, [userID]);

    useEffect(() => {
        // Inject the CSS
        const style = document.createElement('style');
        style.textContent = typingIndicatorCSS;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);

    const findCorrespondingNode = (rootNode, targetNode) => {
        const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_ELEMENT);
        let currentNode = walker.currentNode;

        while (currentNode) {
            if (currentNode.isEqualNode(targetNode)) {
                return currentNode;
            }
            currentNode = walker.nextNode();
        }
        return null;
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;
        const userMessage = chatInput.trim();
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatInput('');
        setIsTyping(true);

        // Construct the prompt using htmlTemplate
        const snippet = "```html\n" + node.outerHTML + "\n```";
        const taskDescription = userMessage;
        const fullTaskDescription = "The user has selected this section of the code to focus on:\n" + snippet + ". The user has also provided the following instructions:\n" + taskDescription;
        
        const constructedPrompt = htmlTemplate(fullTaskDescription, htmlContent);
        // Log the prompt in green
        console.log('\x1b[32m%s\x1b[0m', constructedPrompt);
        const response = await promptLLM(constructedPrompt, htmlSystemTemplate(), modelPreferences.programmerModel);
        // Log the response in yellow
        console.log('\x1b[33m%s\x1b[0m', response);
        setIsTyping(false);

        // Extract code between ```html and ```
        const codeBlockRegex = /```html\n([\s\S]*?)```/;
        const match = response.match(codeBlockRegex);
        let updatedCode = match ? match[1].trim() : response.trim();

        // Update the parent's code state directly with the full HTML
        if (updateHtmlContent) {
            updateHtmlContent(node, updatedCode);
        }

        // Close the editor
        onClose();
    };

    useEffect(() => {
        // Scroll to bottom when new message is added
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    return (
        <motion.div style={styles.nodeEditor}>
            <div style={styles.nodeEditorHeader}>
                <span style={styles.nodeEditorTitle}>{node.nodeName.toLowerCase()}</span>
                <div style={styles.nodeEditorActions}>
                    <IconButton 
                        size="small"
                        onClick={() => setShowChat(prev => !prev)}
                        style={styles.nodeEditorButton}
                    >
                        <FaComments size={16} color={showChat ? darkModeColors.primary : darkModeColors.textSecondary} />
                    </IconButton>
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
                    onChange={(newCode) => {
                        setCode(newCode);
                    }}
                    value={code}
                    name="node-editor"
                    width="100%"
                    height={showChat ? '200px' : '400px'}
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
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        style={styles.chatContainer}
                    >
                        <div style={styles.chatMessages}>
                            {chatMessages.map((msg, index) => (
                                <div key={index} style={msg.role === 'user' ? styles.userMessage : styles.assistantMessage}>
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
                            {isTyping && (
                                <div className="typing-indicator">
                                    <div className="typing-dot" style={{ '--i': 0 }} />
                                    <div className="typing-dot" style={{ '--i': 1 }} />
                                    <div className="typing-dot" style={{ '--i': 2 }} />
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div style={styles.chatInputContainer}>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type your message..."
                                style={styles.chatInput}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                            />
                            <button onClick={handleSendMessage} style={styles.sendButton}>Send</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const DOMTreeViewer = ({ htmlContent, onNodeClick, onNodeUpdate }) => {
    const containerRef = useRef(null);
    const networkRef = useRef(null);
    const [selectedNode, setSelectedNode] = useState(null);
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

    const handleNodeUpdate = (node, newCode) => {
        if (onNodeUpdate) {
            onNodeUpdate(node, newCode);
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
                                onSave={handleNodeUpdate}
                                htmlContent={htmlContent}
                                updateHtmlContent={onNodeUpdate}
                            />
                        </motion.div>
                    </motion.div>
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
        alignItems: 'center',
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
    chatContainer: {
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: darkModeColors.foreground,
        borderTop: `1px solid ${darkModeColors.border}`,
        height: '200px',
        overflow: 'hidden',
    },
    chatMessages: {
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        padding: '8px',
        borderRadius: '12px',
        marginBottom: '4px',
        maxWidth: '80%',
    },
    assistantMessage: {
        alignSelf: 'flex-start',
        backgroundColor: darkModeColors.secondary,
        color: darkModeColors.text,
        padding: '8px',
        borderRadius: '12px',
        marginBottom: '4px',
        maxWidth: '80%',
    },
    chatInputContainer: {
        display: 'flex',
        borderTop: `1px solid ${darkModeColors.border}`,
        padding: '8px',
        backgroundColor: darkModeColors.background,
    },
    chatInput: {
        flex: 1,
        padding: '8px 12px',
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '6px',
        outline: 'none',
        backgroundColor: '#1A1B1E', // Slightly darker than background
        color: darkModeColors.text,
        fontSize: '14px',
        transition: 'all 0.2s ease',
        marginRight: '8px',
        '&:hover': {
            borderColor: `${darkModeColors.primary}50`,
        },
        '&:focus': {
            borderColor: darkModeColors.primary,
            boxShadow: `0 0 0 2px ${darkModeColors.primary}20`,
        },
    },
    sendButton: {
        padding: '8px 16px',
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        '&:hover': {
            backgroundColor: darkModeColors.secondary,
            transform: 'translateY(-1px)',
        },
        '&:active': {
            transform: 'translateY(0)',
        },
    },
};

export default DOMTreeViewer; 