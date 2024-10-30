import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { auth } from '../control/firebase';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import './ChatFeed.css';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCopy, FaSmile, FaTrash, FaBrain, FaDownload, FaExpand } from 'react-icons/fa';
import { FiCopy } from 'react-icons/fi';

const DITTO_AVATAR_KEY = 'dittoAvatar';
const USER_AVATAR_KEY = 'userAvatar';
const DEFAULT_DITTO_AVATAR = '/icons/fancy-ditto.png';

const emojis = ['👍', '❤️', '😊', '🎉', '🤔', '👀', '🚀', '✨'];

function ChatFeed({
    messages,
    histCount,
    isTyping = false,
    hasInputField = false,
    showSenderName = false,
    bubblesCentered = false,
    scrollToBottom = false,
    startAtBottom = false,
    onDeleteMessage,
    onSaveToMemory,
    onReact,
    onImageOpen,
    onImageDownload,
}) {
    const [copied, setCopied] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState({});
    const [actionOverlay, setActionOverlay] = useState(null);
    const [reactionOverlay, setReactionOverlay] = useState(null);
    const feedRef = useRef(null);
    const bottomRef = useRef(null);
    const [profilePic, setProfilePic] = useState(() => {
        return localStorage.getItem(USER_AVATAR_KEY) || '/user_placeholder.png';
    });
    const [dittoAvatar, setDittoAvatar] = useState(() => {
        return localStorage.getItem(DITTO_AVATAR_KEY) || DEFAULT_DITTO_AVATAR;
    });
    const [reactions, setReactions] = useState({});
    const [imageOverlay, setImageOverlay] = useState(null);
    const [imageControlsVisible, setImageControlsVisible] = useState(true);
    const [isSelecting, setIsSelecting] = useState(false);
    const [longPressTimer, setLongPressTimer] = useState(null);
    const [showReactionPicker, setShowReactionPicker] = useState(null);
    const [showMemoryOverlay, setShowMemoryOverlay] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [activeReactionPicker, setActiveReactionPicker] = useState(null);
    const [loadingMemories, setLoadingMemories] = useState(false);

    const scrollToBottomOfFeed = (quick = false) => {
        if (bottomRef.current) {
            if (quick) {
                bottomRef.current.scrollIntoView();
            } else {
                bottomRef.current.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'end'
                });
            }
        }
    };

    useEffect(() => {
        if (startAtBottom) {
            scrollToBottomOfFeed(true);
        } else {
            if (scrollToBottom || messages.length > 0) {
                const timeoutId = setTimeout(() => {
                    scrollToBottomOfFeed();
                }, 100);
                return () => clearTimeout(timeoutId);
            }
        }
    }, [messages, scrollToBottom, isTyping]);

    useEffect(() => {
        // Cache Ditto avatar
        fetch(DEFAULT_DITTO_AVATAR)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64data = reader.result;
                    localStorage.setItem(DITTO_AVATAR_KEY, base64data);
                    setDittoAvatar(base64data);
                };
                reader.readAsDataURL(blob);
            })
            .catch(error => console.error('Error caching Ditto avatar:', error));

        // Get user's Google profile picture
        if (auth.currentUser?.photoURL) {
            fetch(auth.currentUser.photoURL)
                .then(response => response.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const base64data = reader.result;
                        localStorage.setItem(USER_AVATAR_KEY, base64data);
                        setProfilePic(base64data);
                    };
                    reader.readAsDataURL(blob);
                })
                .catch(error => {
                    console.error('Error caching user avatar:', error);
                    setProfilePic('/user_placeholder.png');
                });
        } else {
            setProfilePic('/user_placeholder.png');
        }
    }, []);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setActionOverlay(null);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReaction = (index, emoji) => {
        setReactions((prevReactions) => ({
            ...prevReactions,
            [index]: [...(prevReactions[index] || []), emoji],
        }));
        setReactionOverlay(null);
        setActionOverlay(null);
    };

    const renderMessageText = (text, index) => {
        return (
            <ReactMarkdown
                children={text}
                components={{
                    code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <div className='code-container'>
                                <SyntaxHighlighter
                                    children={String(children).replace(/\n$/, '')}
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag='div'
                                    {...props}
                                />
                                <button
                                    className='copy-button'
                                    onClick={() => handleCopy(String(children))}
                                >
                                    <FiCopy />
                                </button>
                            </div>
                        ) : (
                            <code className='inline-code' {...props}>
                                {children}
                            </code>
                        );
                    },
                }}
            />
        );
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleReact = (messageId) => {
        setActiveReactionPicker(activeReactionPicker === messageId ? null : messageId);
    };

    const handleReactionSelect = (messageId, emoji) => {
        try {
            if (onReact) {
                onReact(messageId, emoji);
            }
            
            // Update local state
            setReactions(prevReactions => {
                const currentReactions = prevReactions[messageId] || [];
                if (currentReactions.includes(emoji)) {
                    return {
                        ...prevReactions,
                        [messageId]: currentReactions.filter(r => r !== emoji)
                    };
                }
                return {
                    ...prevReactions,
                    [messageId]: [...currentReactions, emoji]
                };
            });
        } catch (error) {
            console.error('Error handling reaction:', error);
        }
        setActiveReactionPicker(null);
    };

    const handleReactionClick = (messageId, emoji) => {
        try {
            if (onReact) {
                onReact(messageId, emoji, true); // true indicates removal
            }
            
            // Update local state
            setReactions(prevReactions => {
                const currentReactions = prevReactions[messageId] || [];
                const newReactions = currentReactions.filter(r => r !== emoji);
                if (newReactions.length === 0) {
                    const { [messageId]: _, ...rest } = prevReactions;
                    return rest;
                }
                return {
                    ...prevReactions,
                    [messageId]: newReactions
                };
            });
        } catch (error) {
            console.error('Error removing reaction:', error);
        }
    };

    const handleMemoryClick = (message) => {
        setSelectedMessage(message);
        setShowMemoryOverlay(true);
        if (onSaveToMemory) {
            onSaveToMemory(message);
        }
    };

    const handleDelete = (messageId) => {
        try {
            if (onDeleteMessage) {
                onDeleteMessage(messageId);
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
        setActionOverlay(null);
    };

    const handleSaveToMemory = (message) => {
        if (onSaveToMemory) {
            onSaveToMemory(message);
        }
    };

    const handleBubbleInteraction = (e, index) => {
        if (isSelecting) return; // Don't show options if user is selecting text
        e.preventDefault();
        e.stopPropagation();
        
        const message = messages[index];
        const isImage = message.text.startsWith('http') && 
                       (message.text.endsWith('.png') || message.text.endsWith('.jpg') || 
                        message.text.endsWith('.jpeg') || message.text.endsWith('.gif'));
        
        setActionOverlay({
            index,
            clientX: e.clientX,
            clientY: e.clientY,
            type: isImage ? 'image' : 'text'
        });
    };

    const handleTouchStart = (e, index) => {
        // Check if text is selected
        if (window.getSelection().toString()) {
            return; // Allow native context menu if text is selected
        }

        const timer = setTimeout(() => {
            handleBubbleInteraction(e, index);
        }, 500); // 500ms long press
        
        setLongPressTimer(timer);
    };

    const handleTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
        }
    };

    const handleImageOpen = (imageUrl) => {
        if (onImageOpen) {
            onImageOpen(imageUrl);
        } else {
            // Fallback behavior if no handler provided
            window.open(imageUrl, '_blank');
        }
    };

    const handleImageDownload = async (imageUrl) => {
        try {
            if (onImageDownload) {
                onImageDownload(imageUrl);
            } else {
                // Fallback behavior if no handler provided
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = imageUrl.split('/').pop() || 'image';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Error downloading image:', error);
        }
    };

    const handleShowMemories = async (messageId) => {
        setLoadingMemories(true);
        try {
            const message = messages[messageId];
            if (onSaveToMemory) {
                await onSaveToMemory(message);
            }
        } catch (error) {
            console.error('Error saving to memory:', error);
        } finally {
            setLoadingMemories(false);
        }
    };

    const handleMessageDelete = (messageId) => {
        try {
            if (onDeleteMessage) {
                onDeleteMessage(messageId);
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
        setActionOverlay(null);
    };

    const renderMessageWithAvatar = (message, index) => {
        const isUserMessage = message.sender === 'User';
        const isImage = message.text.startsWith('http') && 
                       (message.text.endsWith('.png') || message.text.endsWith('.jpg') || 
                        message.text.endsWith('.jpeg') || message.text.endsWith('.gif'));

        return (
            <div
                key={index}
                className={`message ${isUserMessage ? 'sent' : 'received'}`}
                onTouchStart={(e) => handleTouchStart(e, index)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                onMouseDown={() => setIsSelecting(false)}
                onMouseMove={(e) => {
                    if (e.buttons === 1) {
                        setIsSelecting(true);
                    }
                }}
                onMouseUp={() => {
                    setTimeout(() => setIsSelecting(false), 100);
                }}
            >
                {!isUserMessage && (
                    <img src={dittoAvatar} alt='Ditto' className='avatar ditto-avatar' />
                )}
                <div className="message-wrapper">
                    <div className="message-content">
                        {renderMessageText(message.text, index)}
                    </div>
                </div>
                {reactions[index] && reactions[index].length > 0 && (
                    <div className='message-reactions'>
                        {reactions[index].map((emoji, emojiIndex) => (
                            <span 
                                key={emojiIndex} 
                                className='reaction'
                                onClick={() => handleReactionClick(index, emoji)}
                            >
                                {emoji}
                            </span>
                        ))}
                    </div>
                )}
                <div className={`message-options ${isUserMessage ? 'options-left' : 'options-right'}`}>
                    {isImage ? (
                        <>
                            <motion.button 
                                className="action-button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleImageOpen(message.text)}
                                title="Open image"
                            >
                                <FaExpand />
                            </motion.button>
                            <motion.button 
                                className="action-button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleImageDownload(message.text)}
                                title="Download image"
                            >
                                <FaDownload />
                            </motion.button>
                        </>
                    ) : (
                        <motion.button 
                            className="action-button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCopy(message.text)}
                            title="Copy message"
                        >
                            <FaCopy />
                        </motion.button>
                    )}
                    <motion.div style={{ position: 'relative' }}>
                        <motion.button 
                            className="action-button"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleReact(index)}
                            title="React to message"
                        >
                            <FaSmile />
                        </motion.button>
                        {activeReactionPicker === index && (
                            <div className={`reaction-picker-menu ${isUserMessage ? 'left' : 'right'}`}>
                                {emojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        className="reaction-picker-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReactionSelect(index, emoji);
                                            setActiveReactionPicker(null);
                                        }}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                    <motion.button 
                        className="action-button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleShowMemories(index)}
                        title="Save to memory"
                        disabled={loadingMemories}
                    >
                        <FaBrain />
                    </motion.button>
                    <motion.button 
                        className="action-button delete-button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleMessageDelete(index)}
                        title="Delete message"
                    >
                        <FaTrash />
                    </motion.button>
                </div>
                {isUserMessage && (
                    <img src={profilePic} alt='User' className='avatar user-avatar' />
                )}
            </div>
        );
    };

    useEffect(() => {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
            scrollToBottomOfFeed();
        }
    }, [messages.length]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (activeReactionPicker !== null) {
                const picker = document.querySelector('.reaction-picker-menu');
                const button = document.querySelector('.action-button');
                if (picker && !picker.contains(event.target) && !button?.contains(event.target)) {
                    setActiveReactionPicker(null);
                }
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [activeReactionPicker]);

    return (
        <div className='chat-feed' ref={feedRef}>
            {messages.map(renderMessageWithAvatar)}
            {isTyping && (
                <div className="message received">
                    <img 
                        src={dittoAvatar} 
                        alt='Ditto typing' 
                        className='avatar ditto-avatar typing-avatar'
                    />
                </div>
            )}
            {hasInputField && <input type='text' className='chat-input-field' />}
            {copied && <div className='copied-notification'>Copied!</div>}
            <div ref={bottomRef} />
        </div>
    );
}

ChatFeed.propTypes = {
    messages: PropTypes.array.isRequired,
    histCount: PropTypes.number,
    isTyping: PropTypes.bool,
    hasInputField: PropTypes.bool,
    showSenderName: PropTypes.bool,
    bubblesCentered: PropTypes.bool,
    scrollToBottom: PropTypes.bool,
    startAtBottom: PropTypes.bool,
    onDeleteMessage: PropTypes.func,
    onSaveToMemory: PropTypes.func,
    onReact: PropTypes.func,
    onImageOpen: PropTypes.func,
    onImageDownload: PropTypes.func,
};

export default ChatFeed;
