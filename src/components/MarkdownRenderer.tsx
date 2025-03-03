import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiCopy } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler";
import { usePlatform } from "@/hooks/usePlatform";
import "./MarkdownRenderer.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer = ({
  content,
  className = "",
}: MarkdownRendererProps) => {
  const { handleImageClick } = useImageViewerHandler();
  const { isIOS } = usePlatform();
  
  if (!content) return null;
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    });
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
            <div className="image-container" style={{ 
              minHeight: isIOS ? '180px' : 'auto',
              minWidth: '100px',
              background: 'rgba(0, 0, 0, 0.05)',
              position: 'relative',
            }}>
              <img
                src={src}
                alt={alt || ""}
                {...props}
                className="markdown-image"
                onClick={() => src && handleImageClick(src)}
                // Keep just the essential attributes for iOS
                draggable="false"
                loading="eager"
              />
            </div>
          ),
          // Handle inline code with copy button - this component only handles inline code
          // since code blocks are handled by the pre component above
          code: ({ className, children, ...props }) => {
            const value = String(children).trim();

            // For inline code, we wrap it with a container to position the copy button
            return (
              <span className="inline-code-container">
                <code className={className} {...props}>
                  {children}
                </code>
                <button
                  className="inline-copy-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(value);
                  }}
                  title="Copy code"
                >
                  <FiCopy />
                </button>
              </span>
            );
          },

          // Handle pre blocks specifically for code blocks
          pre: ({ children, ...props }) => {
            // Find code element and get its props
            let codeElement = null;

            // Check if children has a 'code-0' key (React structures children this way)
            if (
              children &&
              typeof children === "object" &&
              "code-0" in children
            ) {
              codeElement = children["code-0"];
            }
            // Check if children itself is the code element
            else if (children?.props?.node?.tagName === "code") {
              codeElement = children;
            }

            if (codeElement) {
              const { className } = codeElement.props || {};
              const match = /language-(\w+)/.exec(className || "");
              const language = match ? match[1] : "text";

              // Get the code content
              const code = Array.isArray(codeElement.props?.children)
                ? codeElement.props.children[0] || ""
                : codeElement.props?.children || "";

              return (
                <div className="code-block-wrapper">
                  {/* Button container to keep it fixed */}
                  <div className="copy-button-container">
                    <button
                      className="copy-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(String(code));
                      }}
                      title="Copy code"
                    >
                      <FiCopy />
                    </button>
                  </div>
                  
                  {/* Scrollable code container */}
                  <div className="code-container">
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={language}
                      PreTag="pre"
                      wrapLines={true}
                      wrapLongLines={false}
                      customStyle={{
                        margin: 0,
                        padding: '16px',
                        borderRadius: '6px',
                        minWidth: 'min-content',
                      }}
                      {...props}
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                </div>
              );
            }

            // If no code element found, just render the pre
            return <pre {...props}>{children}</pre>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
