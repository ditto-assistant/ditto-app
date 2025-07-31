import ReactMarkdown from "react-markdown"
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
import rehypeRaw from "rehype-raw"
import "./MarkdownRenderer.css"
import { triggerHaptic, HapticPattern } from "@/utils/haptics"

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Custom table parser that works without remark-gfm
const parseMarkdownTables = (content: string): string => {
  let processedContent = content

  // First, extract and process tables from ```markdown code blocks
  const markdownCodeBlockRegex = /```markdown\n([\s\S]*?)\n```/g
  processedContent = processedContent.replace(
    markdownCodeBlockRegex,
    (match, codeContent) => {
      // Process tables within the markdown code block
      return processTableContent(codeContent)
    }
  )

  // Then process any remaining tables in the regular content
  return processTableContent(processedContent)
}

const processTableContent = (content: string): string => {
  const lines = content.split("\n")
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()

    // Check if this line looks like a table row (contains |)
    if (line.includes("|") && line.length > 0) {
      // Look ahead to see if next line is a separator (contains dashes and |)
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ""
      const isTableStart = nextLine.includes("|") && nextLine.includes("-")

      if (isTableStart) {
        // Found a table! Parse it
        const tableHTML = parseTable(lines, i)
        result.push(tableHTML.html)
        i = tableHTML.endIndex
      } else {
        result.push(lines[i])
        i++
      }
    } else {
      result.push(lines[i])
      i++
    }
  }

  return result.join("\n")
}

const parseTable = (
  lines: string[],
  startIndex: number
): { html: string; endIndex: number } => {
  const headerLine = lines[startIndex].trim()
  const separatorLine = lines[startIndex + 1].trim()

  // Parse header
  const headers = headerLine
    .split("|")
    .map((h) => h.trim())
    .filter((h) => h.length > 0)

  // Find table rows
  const rows: string[][] = []
  let currentIndex = startIndex + 2

  while (currentIndex < lines.length) {
    const line = lines[currentIndex].trim()
    if (!line.includes("|") || line.length === 0) {
      break
    }

    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
    if (cells.length > 0) {
      rows.push(cells)
    }
    currentIndex++
  }

  // Generate HTML with proper formatting and line breaks
  let html = '\n<div class="table-wrapper">\n<table class="markdown-table">\n'

  // Header
  html +=
    '<thead class="markdown-table-head">\n<tr class="markdown-table-row">\n'
  headers.forEach((header) => {
    html += `<th class="markdown-table-header">${header}</th>\n`
  })
  html += "</tr>\n</thead>\n"

  // Body
  html += '<tbody class="markdown-table-body">\n'
  rows.forEach((row) => {
    html += '<tr class="markdown-table-row">\n'
    row.forEach((cell) => {
      html += `<td class="markdown-table-cell">${cell}</td>\n`
    })
    html += "</tr>\n"
  })
  html += "</tbody>\n</table>\n</div>\n"

  return {
    html,
    endIndex: currentIndex,
  }
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

  // Pre-process content to handle tables
  const processedContent = parseMarkdownTables(content)

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ href, children, ...props }) => (
            <a {...props} href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          // Enhanced list handling
          ul: ({ children, ...props }) => (
            <ul className="markdown-list markdown-ul" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="markdown-list markdown-ol" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="markdown-list-item" {...props}>
              {children}
            </li>
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
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
