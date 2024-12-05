import React, { useState, useCallback, memo } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiCopy } from "react-icons/fi";
import { IMAGE_PLACEHOLDER_IMAGE, NOT_FOUND_IMAGE } from "@/constants";
import { usePresignedUrls } from "@/hooks/usePresignedUrls";

interface MarkdownMessageProps {
  content: string;
  handleImageClick: (src: string) => void;
  handleCopy?: (text: string) => void;
}

export const MarkdownMessage = memo(
  ({
    content,
    handleImageClick,
    handleCopy = useCallback((text: string) => {
      navigator.clipboard.writeText(text);
      const toast = document.createElement("div");
      toast.className = "copied-notification";
      toast.textContent = "Copied!";
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 2000);
    }, []),
  }: MarkdownMessageProps) => {
    const { getPresignedUrl, getCachedUrl } = usePresignedUrls();
    return (
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            let match = /language-(\w+)/.exec(className || "");
            let hasCodeBlock = false;
            const matchResult = content.match(/```/g);
            if (matchResult) {
              hasCodeBlock = matchResult.length % 2 === 0;
            }
            const onClickCopy = useCallback(
              (e: React.MouseEvent) => {
                e.stopPropagation();
                handleCopy(String(children));
              },
              [handleCopy, children]
            );

            if (hasCodeBlock) {
              return (
                <div className="code-container">
                  {/* @ts-ignore */}
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match?.[1]}
                    PreTag="div"
                    {...props}
                    className="code-block"
                  >
                    {children}
                  </SyntaxHighlighter>
                  <button
                    className="copy-button code-block-button"
                    onClick={onClickCopy}
                    title="Copy code"
                  >
                    <FiCopy />
                  </button>
                </div>
              );
            }

            return (
              <div className="inline-code-container">
                <code className="inline-code" {...props}>
                  {children}
                </code>
                <button
                  className="copy-button inline-code-button"
                  onClick={onClickCopy}
                  title="Copy code"
                >
                  <FiCopy />
                </button>
              </div>
            );
          },
          img: ({ src, alt, ...props }) => {
            const [imgSrc, setImgSrc] = useState(src);
            let cachedUrl: { ok?: string | undefined } = { ok: undefined };
            if (src) {
              cachedUrl = getCachedUrl(src);
            }
            const onImageClick = useCallback(
              (e: React.MouseEvent) => {
                e.stopPropagation();
                if (imgSrc) {
                  handleImageClick(imgSrc);
                }
              },
              [imgSrc, handleImageClick]
            );

            if (cachedUrl.ok) {
              setImgSrc(cachedUrl.ok);
              return (
                <img
                  {...props}
                  src={imgSrc}
                  alt={alt}
                  className="chat-image"
                  onClick={onImageClick}
                />
              );
            }

            if (!src) {
              return (
                <img
                  {...props}
                  src={NOT_FOUND_IMAGE}
                  alt={alt}
                  className="chat-image"
                />
              );
            }

            if (!src.startsWith("https://firebasestorage.googleapis.com/")) {
              getPresignedUrl(src).then(
                (url) => {
                  if (url.ok) {
                    setImgSrc(url.ok);
                  }
                },
                (err) => {
                  console.error(`Image Load error: ${err}; src: ${src}`);
                }
              );
            }

            return (
              <img
                {...props}
                src={imgSrc}
                alt={alt}
                className="chat-image"
                onClick={onImageClick}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  const errSrc = e.currentTarget.src;
                  console.error(`Image load error: ${e}; src: ${errSrc}`);
                  if (errSrc === src) {
                    setImgSrc(IMAGE_PLACEHOLDER_IMAGE);
                  } else {
                    setImgSrc(src);
                  }
                  if (errSrc.startsWith("https://ditto-content")) {
                    setTimeout(() => {
                      setImgSrc(errSrc);
                    }, 3_000);
                  }
                }}
              />
            );
          },
          a: ({ href, children, ...props }) => (
            <a
              {...props}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
              }}
              style={{
                color: "#3941b8",
                textDecoration: "none",
                textShadow: "0 0 1px #7787d7",
                cursor: "pointer",
                pointerEvents: "auto",
              }}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  }
);
