import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FiCopy } from 'react-icons/fi';
import { IMAGE_PLACEHOLDER_IMAGE, NOT_FOUND_IMAGE } from '@/constants';
import './MarkdownMessage.css';

interface MarkdownMessageProps {
    displayText: string;
    handleCopy: (text: string) => void;
    handleImageClick: (src: string) => void;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({
    displayText,
    handleCopy,
    handleImageClick,
}) => {
    return (
        <ReactMarkdown
            children={displayText}
            components={{
                a: ({ node, href, children, ...props }) => (
                    <a
                        {...props}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        className="markdown-link"
                    >
                        {children}
                    </a>
                ),

                img: ({ node, src, alt, ...props }) => {
                    if (!src) return null;

                    return (
                        <img
                            {...props}
                            src={src}
                            alt={alt}
                            className="markdown-image"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleImageClick(src);
                            }}
                            onError={(e) => {
                                e.currentTarget.src = NOT_FOUND_IMAGE;
                            }}
                        />
                    );
                },

                code: ({ node, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');

                    if (match) {
                        return (
                            <div className="markdown-code-container">
                                <SyntaxHighlighter
                                    PreTag="div"
                                    children={String(children).replace(/\n$/, '')}
                                    language={match[1]}
                                    style={vscDarkPlus}
                                    {...props}
                                    className="markdown-code-block"
                                />
                                <button
                                    className="markdown-copy-button code-block-button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopy(String(children).replace(/\n$/, ''));
                                    }}
                                    title="Copy code"
                                >
                                    <FiCopy />
                                </button>
                            </div>
                        );
                    }

                    return (
                        <div className="markdown-inline-code-container">
                            <code {...props} className={className}>
                                {children}
                            </code>
                            <button
                                className="markdown-copy-button inline-code-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(String(children).replace(/\n$/, ''));
                                }}
                                title="Copy code"
                            >
                                <FiCopy />
                            </button>
                        </div>
                    );
                },
            }}
        />
    );
};
