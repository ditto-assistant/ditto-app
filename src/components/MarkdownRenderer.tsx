import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import {
  vscDarkPlus,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism"
import { toast } from "sonner"
import { Copy } from "lucide-react"
import { useImageViewerHandler } from "@/hooks/useImageViewerHandler"
import { usePlatform } from "@/hooks/usePlatform"
import { useTheme } from "@/components/theme-provider"
import "./MarkdownRenderer.css"
import { triggerHaptic, HapticPattern } from "@/utils/haptics"
interface MarkdownRendererProps {
  content: string
  className?: string
}

const MarkdownRenderer = ({
  content,
  className = "",
}: MarkdownRendererProps) => {
  const { handleImageClick } = useImageViewerHandler()
  const { isIOS } = usePlatform()
  const { theme } = useTheme()
  const triggerLightHaptic = () => triggerHaptic(HapticPattern.Light)

  if (!content) return null

  const handleCopy = (text: string) => {
    triggerLightHaptic()
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard")
    })
  }

  // Choose the appropriate syntax highlighting theme based on the current theme
  const syntaxTheme = theme === "dark" ? vscDarkPlus : oneLight

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
              className="markdown-image image-container"
              style={{
                minHeight: isIOS ? "180px" : "auto",
                minWidth: "100px",
                background:
                  theme === "dark"
                    ? "rgba(0, 0, 0, 0.2)"
                    : "rgba(0, 0, 0, 0.05)",
                position: "relative",
              }}
              onClick={() => src && handleImageClick(src)}
              // Keep just the essential attributes for iOS
              draggable="false"
              loading="eager"
            />
          ),
          // Handle inline code with copy button - this component only handles inline code
          // since code blocks are handled by the pre component below
          code: ({ className, children, ...props }) => {
            const value = String(children).trim()

            // For inline code, we wrap it with a container to position the copy button
            return (
              <span className="inline-code-container">
                <code className={className} {...props}>
                  {children}
                </code>
                <button
                  className="inline-copy-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy(value)
                  }}
                  title="Copy code"
                >
                  <Copy />
                </button>
              </span>
            )
          },

          // Handle pre blocks specifically for code blocks
          pre: ({ children, ...props }) => {
            // Find code element and get its props
            let codeElement = null

            // Check if children has a 'code-0' key (React structures children this way)
            if (
              children &&
              typeof children === "object" &&
              "code-0" in children
            ) {
              codeElement = children["code-0"]
            }
            // Check if children itself is the code element
            // @ts-expect-error - props does exist in the code block case
            else if (children?.props?.node?.tagName === "code") {
              codeElement = children
            }

            if (codeElement) {
              // @ts-expect-error - props does exist in the code block case
              const { className } = codeElement.props || {}
              const match = /language-(\w+)/.exec(className || "")
              const language = match ? match[1] : "text"

              // @ts-expect-error - props does exist in the code block case
              const code = Array.isArray(codeElement.props?.children)
                ? // @ts-expect-error - props does exist in the code block case
                  codeElement.props.children[0] || ""
                : // @ts-expect-error - props does exist in the code block case
                  codeElement.props?.children || ""

              return (
                <div className="code-block-wrapper">
                  {/* Button container to keep it fixed */}
                  <div className="copy-button-container">
                    <button
                      className="copy-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy(String(code))
                      }}
                      title="Copy code"
                    >
                      <Copy />
                    </button>
                  </div>

                  {/* Scrollable code container */}
                  <div className="code-container">
                    <SyntaxHighlighter
                      language={language}
                      PreTag="pre"
                      wrapLines={true}
                      wrapLongLines={false}
                      customStyle={{
                        margin: 0,
                        padding: "16px",
                        borderRadius: "6px",
                        minWidth: "min-content",
                        backgroundColor: "var(--more-muted)",
                        color: theme === "dark" ? "#f1f3f5" : "#2b2d31",
                      }}
                      style={syntaxTheme}
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                </div>
              )
            }

            // If no code element found, just render the pre
            return <pre {...props}>{children}</pre>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
