import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import ReactMarkdown from 'react-markdown';
import { FaTrash, FaSpinner, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { FiCopy } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { deleteConversation } from '../control/memory';
import { auth } from '../control/firebase';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const MemoryNetwork = ({ memories = [] }) => {
    const containerRef = useRef(null);
    const networkRef = useRef(null);
    const [selectedMemory, setSelectedMemory] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState(null);
    const [deletingMemories, setDeletingMemories] = useState(new Set());
    const [isDetailsVisible, setIsDetailsVisible] = useState(true);
    const [imageOverlay, setImageOverlay] = useState(null);
    const [failedImages, setFailedImages] = useState(new Set());
    const [copied, setCopied] = useState(false);

    const handleNodeSelection = (nodeId, nodes) => {
        if (!nodeId) return;
        
        const clickedNode = nodes.get(nodeId);
        let memory;
        
        // Check if it's the central node
        if (nodeId === 1) {
            memory = {
                prompt: memories[0].prompt,
                response: null,
                id: 'central'
            };
        } else {
            // Check parent nodes
            memory = memories[0].related?.find(mem => mem.prompt === clickedNode.title);
            if (!memory) {
                // Check child nodes
                memory = memories[0].related?.flatMap(mem => mem.related)
                    .find(mem => mem.prompt === clickedNode.title);
            }
        }
        
        if (memory) {
            setSelectedMemory(memory);
            // Ensure the memory details are visible on mobile
            setTimeout(() => {
                const detailsElement = document.querySelector('.memory-details');
                if (detailsElement) {
                    detailsElement.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100);
        }
    };

    useEffect(() => {
        if (!containerRef.current || !memories[0]) return;

        const nodes = new DataSet();
        const edges = new DataSet();
        let nodeId = 1;

        // Add central node for user's prompt
        const centralId = nodeId++;
        nodes.add({
            id: centralId,
            label: 'Your Prompt',
            title: memories[0].prompt,
            color: '#FF5733',
            size: 30,
            font: { size: 16 }
        });

        // Add the top 5 related memories
        memories[0].related?.forEach((memory, index) => {
            const parentId = nodeId++;
            nodes.add({
                id: parentId,
                label: `Memory ${index + 1}`,
                title: memory.prompt,
                color: '#3498DB',
                size: 25
            });
            edges.add({ 
                from: centralId, 
                to: parentId,
                length: 200
            });

            // Add the 2 related memories for each parent
            memory.related?.forEach((relatedMemory, relatedIndex) => {
                const childId = nodeId++;
                nodes.add({
                    id: childId,
                    label: `Related ${index + 1}.${relatedIndex + 1}`,
                    title: relatedMemory.prompt,
                    color: '#2ECC71',
                    size: 20
                });
                edges.add({ 
                    from: parentId, 
                    to: childId,
                    length: 150
                });
            });
        });

        const options = {
            nodes: {
                shape: 'dot',
                font: {
                    color: '#ffffff',
                    face: 'Arial'
                },
                borderWidth: 2,
                shadow: true
            },
            edges: {
                color: { color: '#ffffff', opacity: 0.3 },
                width: 2,
                smooth: {
                    type: 'continuous'
                },
                arrows: {
                    to: { enabled: true, scaleFactor: 0.5 }
                }
            },
            physics: {
                enabled: true,
                barnesHut: {
                    gravitationalConstant: -3000,
                    centralGravity: 0.3,
                    springLength: 200,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 0.1
                },
                stabilization: {
                    enabled: true,
                    iterations: 1000,
                    updateInterval: 100
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                multiselect: false,
                dragView: true,
                zoomView: true,
                selectConnectedEdges: false,
                hoverConnectedEdges: true
            }
        };

        networkRef.current = new Network(containerRef.current, { nodes, edges }, options);

        // Handle both click and touch events
        networkRef.current.on('click', (params) => {
            if (params.nodes.length > 0) {
                handleNodeSelection(params.nodes[0], nodes);
            }
        });

        networkRef.current.on('selectNode', (params) => {
            if (params.nodes.length > 0) {
                handleNodeSelection(params.nodes[0], nodes);
            }
        });

        // Add touch event handling
        const hammer = new window.Hammer(containerRef.current);
        hammer.on('tap', (event) => {
            const { offsetX, offsetY } = event.srcEvent;
            const nodeId = networkRef.current.getNodeAt({ x: offsetX, y: offsetY });
            if (nodeId) {
                handleNodeSelection(nodeId, nodes);
            }
        });

        return () => {
            networkRef.current.destroy();
            hammer.destroy();
        };
    }, [memories]);

    const handleDeleteMemory = async (memory) => {
        setDeleteConfirmation({
            memory,
            docId: memory.id
        });
    };

    const confirmDelete = async () => {
        if (!deleteConfirmation) return;

        const { memory, docId } = deleteConfirmation;
        const userID = auth.currentUser.uid;

        try {
            setDeletingMemories(prev => new Set([...prev, docId]));
            await new Promise(resolve => setTimeout(resolve, 300));

            const success = await deleteConversation(userID, docId);
            
            if (success) {
                // Clear the selected memory if it was deleted
                if (selectedMemory && selectedMemory.id === docId) {
                    setSelectedMemory(null);
                }
                // Dispatch event to trigger memory count refresh
                window.dispatchEvent(new Event('memoryUpdated'));
            }
        } catch (error) {
            console.error('Error deleting memory:', error);
        } finally {
            setDeletingMemories(prev => {
                const next = new Set(prev);
                next.delete(docId);
                return next;
            });
            setDeleteConfirmation(null);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleImageClick = (src) => {
        setImageOverlay(src);
    };

    const closeImageOverlay = () => {
        setImageOverlay(null);
    };

    return (
        <div style={styles.container}>
            <div ref={containerRef} style={{
                ...styles.network,
                height: isDetailsVisible && selectedMemory ? '50vh' : '100vh',
                transition: 'height 0.2s ease-in-out'
            }} />
            <AnimatePresence>
                {selectedMemory && (
                    <motion.div 
                        className="memory-details-container"
                        style={styles.memoryDetailsContainer}
                        initial={{ opacity: 1 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.button
                            onClick={() => setIsDetailsVisible(!isDetailsVisible)}
                            style={styles.toggleButton}
                            whileHover={{ backgroundColor: '#4f545c' }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {isDetailsVisible ? <FaChevronDown /> : <FaChevronUp />}
                        </motion.button>
                        <AnimatePresence>
                            {isDetailsVisible && (
                                <motion.div 
                                    className="memory-details" 
                                    style={styles.memoryDetails}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: '50vh', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                >
                                    <div style={styles.memoryHeader}>
                                        <h4 style={{ margin: 0 }}>Memory Details</h4>
                                        {selectedMemory.id !== 'central' && (
                                            <button
                                                onClick={() => handleDeleteMemory(selectedMemory)}
                                                style={styles.deleteButton}
                                                title="Delete memory"
                                            >
                                                <FaTrash />
                                            </button>
                                        )}
                                    </div>
                                    <div className="memory-prompt" style={styles.memoryContent}>
                                        <strong>Prompt:</strong>
                                        <ReactMarkdown
                                            components={{
                                                code({ node, inline, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    if (!inline && match) {
                                                        return (
                                                            <div style={styles.codeContainer}>
                                                                <SyntaxHighlighter
                                                                    children={String(children).replace(/\n$/, '')}
                                                                    style={vscDarkPlus}
                                                                    language={match[1]}
                                                                    PreTag="div"
                                                                    {...props}
                                                                />
                                                                <button
                                                                    onClick={() => handleCopy(String(children))}
                                                                    style={styles.copyButton}
                                                                >
                                                                    <FiCopy />
                                                                </button>
                                                            </div>
                                                        );
                                                    }
                                                    return <code className={className} {...props}>{children}</code>;
                                                },
                                                img: ({ src, alt }) => {
                                                    if (failedImages.has(src)) {
                                                        return <span style={styles.invalidImage}>Invalid image</span>;
                                                    }
                                                    return (
                                                        <img
                                                            src={src}
                                                            alt={alt}
                                                            style={styles.image}
                                                            onClick={() => handleImageClick(src)}
                                                            onError={() => setFailedImages(prev => new Set([...prev, src]))}
                                                        />
                                                    );
                                                }
                                            }}
                                        >
                                            {selectedMemory.prompt}
                                        </ReactMarkdown>
                                    </div>
                                    {selectedMemory.response && (
                                        <div className="memory-response" style={styles.memoryContent}>
                                            <strong>Response:</strong>
                                            <ReactMarkdown
                                                components={{
                                                    code({ node, inline, className, children, ...props }) {
                                                        const match = /language-(\w+)/.exec(className || '');
                                                        if (!inline && match) {
                                                            return (
                                                                <div style={styles.codeContainer}>
                                                                    <SyntaxHighlighter
                                                                        children={String(children).replace(/\n$/, '')}
                                                                        style={vscDarkPlus}
                                                                        language={match[1]}
                                                                        PreTag="div"
                                                                        {...props}
                                                                    />
                                                                    <button
                                                                        onClick={() => handleCopy(String(children))}
                                                                        style={styles.copyButton}
                                                                    >
                                                                        <FiCopy />
                                                                    </button>
                                                                </div>
                                                            );
                                                        }
                                                        return <code className={className} {...props}>{children}</code>;
                                                    },
                                                    img: ({ src, alt }) => {
                                                        if (failedImages.has(src)) {
                                                            return <span style={styles.invalidImage}>Invalid image</span>;
                                                        }
                                                        return (
                                                            <img
                                                                src={src}
                                                                alt={alt}
                                                                style={styles.image}
                                                                onClick={() => handleImageClick(src)}
                                                                onError={() => setFailedImages(prev => new Set([...prev, src]))}
                                                            />
                                                        );
                                                    }
                                                }}
                                            >
                                                {selectedMemory.response}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Image Overlay */}
            <AnimatePresence>
                {imageOverlay && (
                    <motion.div 
                        style={styles.imageOverlay}
                        onClick={closeImageOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            style={styles.imageOverlayContent}
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.8 }}
                        >
                            <img src={imageOverlay} alt="Full size" style={styles.overlayImage} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Copy Notification */}
            {copied && (
                <div style={styles.copiedNotification}>
                    Copied!
                </div>
            )}

            {/* Delete Confirmation Overlay */}
            <AnimatePresence>
                {deleteConfirmation && (
                    <motion.div 
                        className="delete-confirmation-overlay"
                        onClick={() => setDeleteConfirmation(null)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={styles.deleteOverlay}
                    >
                        <motion.div 
                            className="delete-confirmation-content"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ scale: 0.9, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 50 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            style={styles.deleteContent}
                        >
                            <div className="delete-confirmation-title" style={styles.deleteTitle}>
                                Delete Memory?
                            </div>
                            <div className="delete-confirmation-message" style={styles.deleteMessage}>
                                Are you sure you want to delete this memory? This action cannot be undone.
                            </div>
                            <div className={`delete-confirmation-docid ${!deleteConfirmation.docId ? 'not-found' : ''}`}
                                 style={styles.deleteDocId}>
                                Document ID: {deleteConfirmation.docId || 'Not found'}
                            </div>
                            <div className="delete-confirmation-buttons" style={styles.deleteButtons}>
                                <button 
                                    className="delete-confirmation-button cancel"
                                    onClick={() => setDeleteConfirmation(null)}
                                    style={styles.cancelButton}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="delete-confirmation-button confirm"
                                    onClick={confirmDelete}
                                    disabled={!deleteConfirmation.docId || deletingMemories.has(deleteConfirmation.docId)}
                                    style={styles.confirmButton}
                                >
                                    {deletingMemories.has(deleteConfirmation.docId) ? (
                                        <FaSpinner className="spinner" style={styles.spinner} />
                                    ) : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100vh',
        overflow: 'hidden'
    },
    network: {
        width: '100%',
        backgroundColor: '#2f3136',
        borderRadius: '8px',
        transition: 'height 0.2s ease-in-out'
    },
    memoryDetailsContainer: {
        position: 'relative',
        width: '100%',
        height: '50vh',
    },
    toggleButton: {
        position: 'absolute',
        top: -20,
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#36393f',
        border: 'none',
        borderRadius: '50%',
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        zIndex: 1,
        transition: 'background-color 0.2s ease'
    },
    memoryDetails: {
        padding: '20px',
        backgroundColor: '#2f3136',
        borderRadius: '8px',
        color: '#ffffff',
        height: '50vh',
        overflowY: 'auto',
        position: 'relative'
    },
    memoryContent: {
        marginTop: '10px',
        padding: '10px',
        backgroundColor: '#36393f',
        borderRadius: '4px'
    },
    memoryHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
    },
    deleteButton: {
        background: 'none',
        border: 'none',
        color: '#ff4444',
        cursor: 'pointer',
        padding: '8px',
        borderRadius: '4px',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    deleteOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5000,
        backdropFilter: 'blur(5px)'
    },
    deleteContent: {
        backgroundColor: '#36393f',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '400px',
        textAlign: 'center',
        color: '#ffffff'
    },
    deleteTitle: {
        fontSize: '1.2em',
        marginBottom: '16px',
        fontWeight: 600
    },
    deleteMessage: {
        marginBottom: '24px',
        color: 'rgba(255, 255, 255, 0.8)',
        lineHeight: 1.4
    },
    deleteDocId: {
        fontFamily: 'monospace',
        backgroundColor: '#2f3136',
        padding: '8px',
        borderRadius: '6px',
        marginBottom: '24px',
        wordBreak: 'break-all',
        fontSize: '0.9em',
        color: '#a0a0a0'
    },
    deleteButtons: {
        display: 'flex',
        justifyContent: 'center',
        gap: '16px'
    },
    cancelButton: {
        padding: '10px 20px',
        borderRadius: '6px',
        border: 'none',
        fontWeight: 500,
        cursor: 'pointer',
        backgroundColor: '#4f545c',
        color: 'white',
        transition: 'all 0.2s ease'
    },
    confirmButton: {
        padding: '10px 20px',
        borderRadius: '6px',
        border: 'none',
        fontWeight: 500,
        cursor: 'pointer',
        backgroundColor: '#ed4245',
        color: 'white',
        transition: 'all 0.2s ease'
    },
    spinner: {
        animation: 'spin 1s linear infinite'
    },
    codeContainer: {
        position: 'relative',
        marginTop: '10px',
        marginBottom: '10px',
        backgroundColor: '#282c34',
        borderRadius: '8px',
        overflow: 'hidden'
    },
    copyButton: {
        position: 'absolute',
        top: '8px',
        right: '8px',
        backgroundColor: 'rgba(71, 82, 196, 0.9)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        padding: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease'
    },
    image: {
        maxWidth: '100%',
        maxHeight: '300px',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'transform 0.2s ease'
    },
    invalidImage: {
        display: 'inline-block',
        color: '#ff4444',
        fontStyle: 'italic',
        padding: '4px 8px',
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        borderRadius: '4px',
        margin: '4px 0'
    },
    imageOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5000
    },
    imageOverlayContent: {
        maxWidth: '90%',
        maxHeight: '90vh'
    },
    overlayImage: {
        maxWidth: '100%',
        maxHeight: '90vh',
        objectFit: 'contain'
    },
    copiedNotification: {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(46, 204, 113, 0.9)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '4px',
        zIndex: 5001
    }
};

export default MemoryNetwork; 