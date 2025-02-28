import { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiCopy } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler";
import "./MarkdownRenderer.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer = ({
  content,
  className = "",
}: MarkdownRendererProps) => {
  const { handleImageClick } = useImageViewerHandler(false);

  if (!content) return null;

  // Replace code block markers for better formatting
  let displayText = content.replace(
    /```[a-zA-Z0-9]+/g,
    (match) => `\n${match}`
  );
  displayText = displayText.replace(/```\./g, "```\n");

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => (
            <a {...props} href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt, ...props }) => (
            <img
              src={src}
              alt={alt || ""}
              {...props}
              className="markdown-image"
              onClick={() => src && handleImageClick(src)}
            />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");

            // Check for code blocks
            const codeBlockMatches = displayText.match(/```/g);
            let hasCodeBlock = false;
            if (codeBlockMatches && codeBlockMatches.length % 2 === 0) {
              hasCodeBlock = true;
            }

            // Handle code blocks
            if (!inline && match) {
              return (
                <div className="code-container">
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                  <button
                    className="copy-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(String(children).replace(/\n$/, ""));
                    }}
                    title="Copy code"
                  >
                    <FiCopy />
                  </button>
                </div>
              );
            } else if (!inline && hasCodeBlock) {
              // Use txt as fallback language
              return (
                <div className="code-container">
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language="txt"
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, "")}
                  </SyntaxHighlighter>
                  <button
                    className="copy-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(String(children).replace(/\n$/, ""));
                    }}
                    title="Copy code"
                  >
                    <FiCopy />
                  </button>
                </div>
              );
            } else {
              // Inline code
              const inlineText = String(children).replace(/\n$/, "");
              return (
                <span className="inline-code-container">
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                  <button
                    className="copy-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(inlineText);
                    }}
                    title="Copy code"
                  >
                    <FiCopy />
                  </button>
                </span>
              );
            }
          },
        }}
      >
        {displayText}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
