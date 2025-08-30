import React from "react"
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
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import addClasses from "rehype-class-names"
import "./MarkdownRenderer.css"
import { triggerHaptic, HapticPattern } from "@/utils/haptics"

interface MarkdownRendererProps {
  content: string
  className?: string
}

// Configuration for rehype-class-names plugin
// Using supported selectors from hast-util-select
const classNamesConfig = {
  table: "markdown-table",
  thead: "markdown-table-head",
  tbody: "markdown-table-body",
  tr: "markdown-table-row",
  th: "markdown-table-header",
  td: "markdown-table-cell",
  ul: "markdown-list markdown-ul",
  ol: "markdown-list markdown-ol",
  li: "markdown-list-item",
  img: "markdown-image",
  // Original approach - code elements that are not inside pre elements
  "code:not(pre code)": "inline-code",
}

// Minimal sanitizer schema that allows class attributes on elements that need them
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // Allow className on container elements used by custom renderers
    div: [...(defaultSchema?.attributes?.div ?? []), ["className"]],
    // Allow className on table elements
    table: [...(defaultSchema?.attributes?.table ?? []), ["className"]],
    thead: [...(defaultSchema?.attributes?.thead ?? []), ["className"]],
    tbody: [...(defaultSchema?.attributes?.tbody ?? []), ["className"]],
    tr: [...(defaultSchema?.attributes?.tr ?? []), ["className"]],
    th: [...(defaultSchema?.attributes?.th ?? []), ["className"]],
    td: [...(defaultSchema?.attributes?.td ?? []), ["className"]],
    // Allow className on list elements
    ul: [...(defaultSchema?.attributes?.ul ?? []), ["className"]],
    ol: [...(defaultSchema?.attributes?.ol ?? []), ["className"]],
    li: [...(defaultSchema?.attributes?.li ?? []), ["className"]],
    // Allow className on other elements
    img: [...(defaultSchema?.attributes?.img ?? []), ["className"]],
    code: [...(defaultSchema?.attributes?.code ?? []), ["className"]],
  },
}

// Error boundary for catching rendering errors
class MarkdownErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("MarkdownRenderer error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="markdown-content markdown-error">
          <p style={{ color: "var(--muted-foreground)" }}>
            Error rendering markdown content. The content may contain
            unsupported formatting.
          </p>
        </div>
      )
    }

    return this.props.children
  }
}

// TypeScript interfaces for safe code block handling
interface ReactMarkdownCodeProps {
  className?: string
  children?: React.ReactNode[] | React.ReactNode
  node?: { tagName: string }
}

interface CodeElement {
  props: ReactMarkdownCodeProps
}

// Type guards for safe property access
const isCodeElement = (element: any): element is CodeElement => {
  return (
    element &&
    typeof element === "object" &&
    element.props &&
    typeof element.props === "object"
  )
}

const extractCodeContent = (codeElement: CodeElement): string => {
  const { children } = codeElement.props

  // Helper function to recursively extract text from React elements
  const extractText = (node: any): string => {
    if (typeof node === "string") {
      return node
    }
    if (typeof node === "number") {
      return String(node)
    }
    if (node === null || node === undefined) {
      return ""
    }
    if (Array.isArray(node)) {
      return node.map(extractText).join("")
    }
    if (typeof node === "object" && node.props && node.props.children) {
      return extractText(node.props.children)
    }
    // For any other object types, try to get nodeValue or textContent
    if (typeof node === "object" && node.nodeValue) {
      return node.nodeValue
    }
    return ""
  }

  return extractText(children)
}

// Constants for security and validation
const MAX_CONTENT_LENGTH = 100000 // 100KB limit
const MAX_TABLE_ROWS = 100
const MAX_TABLE_COLUMNS = 20

// Custom table parser that works without remark-gfm
const parseMarkdownTables = (content: string): string => {
  if (typeof content !== "string" || content.length > MAX_CONTENT_LENGTH) {
    console.warn("Content validation failed: invalid type or size")
    return content
  }

  // Quick check to avoid processing if no tables are present
  // This improves performance during streaming
  if (!content.includes("|")) {
    return content
  }

  // Process any tables in the content
  return processTableContent(content)
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
        // Check if we have at least one data row after the separator
        // This prevents rendering incomplete tables during streaming
        const hasDataRow =
          i + 2 < lines.length && lines[i + 2].trim().includes("|")

        if (hasDataRow) {
          // Found a complete enough table! Parse it
          try {
            const tableHTML = parseTable(lines, i)
            result.push(tableHTML.html)
            i = tableHTML.endIndex
          } catch (error) {
            console.warn("Failed to parse markdown table:", error)
            result.push(lines[i])
            i++
          }
        } else {
          // Table is incomplete (still streaming), keep as markdown
          result.push(lines[i])
          i++
        }
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

// Helper function to process markdown within table cells
const processTableCellMarkdown = (text: string): string => {
  if (!text) return ""

  // Process code blocks (triple backticks) first, before inline code
  text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, language, code) => {
    const langClass = language ? ` language-${language}` : ""
    return `<pre><code${langClass ? ` class="${langClass.trim()}"` : ""}>${code.trim()}</code></pre>`
  })

  // Process bold text
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  text = text.replace(/__([^_]+)__/g, "<strong>$1</strong>")

  // Process italic text
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>")
  text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, "<em>$1</em>")

  // Process inline code (single backticks) - but avoid already processed code blocks
  // Class will be added by rehype-class-names plugin
  text = text.replace(
    /(?<!<code[^>]*>)`([^`]+)`(?![^<]*<\/code>)/g,
    "<code>$1</code>"
  )

  // Process line breaks
  text = text.replace(/<br\s*\/?>/gi, "<br>")
  text = text.replace(/\n/g, "<br>")

  // Process links
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  return text
}

const parseTable = (
  lines: string[],
  startIndex: number
): { html: string; endIndex: number } => {
  if (!Array.isArray(lines) || startIndex >= lines.length) {
    throw new Error("Invalid table parsing parameters")
  }
  const headerLine = lines[startIndex]?.trim() || ""
  // Parse header with validation
  const headers = headerLine
    .split("|")
    .map((h) => h.trim())
    .filter((h) => h.length > 0)

  if (headers.length === 0 || headers.length > MAX_TABLE_COLUMNS) {
    throw new Error("Invalid table structure: invalid header count")
  }

  // Find table rows with validation
  const rows: string[][] = []
  let currentIndex = startIndex + 2

  while (currentIndex < lines.length && rows.length < MAX_TABLE_ROWS) {
    const line = lines[currentIndex]?.trim() || ""
    if (!line.includes("|") || line.length === 0) {
      break
    }

    const cells = line.split("|").filter((c) => c.length > 0)

    if (cells.length > 0) {
      rows.push(cells)
    }
    currentIndex++
  }

  // Generate HTML with proper formatting and accessibility
  // Classes are now handled by rehype-class-names plugin
  let html =
    '\n<div class="table-wrapper" role="region" aria-label="Data table" tabindex="0">\n<table role="table">\n'

  // Header with accessibility and markdown processing
  html += '<thead>\n<tr role="row">\n'
  headers.forEach((header) => {
    const processedHeader = processTableCellMarkdown(header)
    html += `<th role="columnheader" scope="col">${processedHeader}</th>\n`
  })
  html += "</tr>\n</thead>\n"

  // Body with accessibility and markdown processing
  html += "<tbody>\n"
  rows.forEach((row) => {
    html += '<tr role="row">\n'
    row.forEach((cell) => {
      const processedCell = processTableCellMarkdown(cell)
      html += `<td role="gridcell">${processedCell}</td>\n`
    })
    html += "</tr>\n"
  })
  html += "</tbody>\n</table>\n</div>\n"

  return {
    html,
    endIndex: currentIndex,
  }
}

const MarkdownRendererCore = ({
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

  // Minimal preprocessing to handle Unicode issues before rehype-sanitize
  const preProcessContent = (text: string): string => {
    if (typeof text !== "string") return ""

    // First, extract all content from ```markdown code blocks
    // This prevents ReactMarkdown from treating them as code blocks
    text = text.replace(
      /```markdown\s*\n([\s\S]*?)\n```/g,
      (match, markdownContent) => {
        // Return the raw markdown content without the code block wrapper
        // Preserve the whitespace and formatting
        return "\n" + markdownContent + "\n"
      }
    )

    // Only fix Unicode characters that cause DOM parsing errors
    // Non-breaking hyphen (U+2011) is the main culprit from the error reports
    text = text.replace(/\u2011/g, "-")

    // Remove zero-width characters that can cause parsing issues
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, "")

    // Strip ```markdown fenced blocks to prevent breaking our custom table parser
    // Replace ```markdown\n...\n``` with the inner content
    text = text.replace(
      /```\s*markdown\n([\s\S]*?)```/gi,
      (m, inner) => inner.trim() + "\n"
    )

    // Also handle trailing triple backticks left at the end of messages
    text = text.replace(/\n?```\s*$/g, "")

    return text
  }

  // Pre-process content to handle tables and Unicode issues
  let processedContent: string
  try {
    const preprocessedContent = preProcessContent(content)
    processedContent = parseMarkdownTables(preprocessedContent)
  } catch (error) {
    console.error("Error processing markdown content:", error)
    // Fallback to displaying raw content with basic escaping
    processedContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        rehypePlugins={[
          rehypeRaw,
          [addClasses, classNamesConfig],
          [rehypeSanitize, sanitizeSchema],
        ]}
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
              className="image-container"
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
            // The inline-code class is now handled by rehype-class-names plugin
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
            let codeElement: CodeElement | null = null

            // Check if children has a 'code-0' key (React structures children this way)
            if (
              children &&
              typeof children === "object" &&
              "code-0" in children &&
              isCodeElement((children as any)["code-0"])
            ) {
              codeElement = (children as any)["code-0"]
            }
            // Check if children itself is the code element
            else if (isCodeElement(children)) {
              codeElement = children
            }

            if (codeElement) {
              const { className } = codeElement.props
              const match = /language-(\w+)/.exec(className || "")
              const language = match ? match[1] : "text"

              const code = extractCodeContent(codeElement)

              return (
                <div className="code-block-wrapper">
                  {/* Button container to keep it fixed */}
                  <div className="copy-button-container">
                    <button
                      className="copy-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCopy(code)
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

// Wrap the core component with error boundary
const MarkdownRenderer = (props: MarkdownRendererProps) => {
  return (
    <MarkdownErrorBoundary>
      <MarkdownRendererCore {...props} />
    </MarkdownErrorBoundary>
  )
}

export default MarkdownRenderer
