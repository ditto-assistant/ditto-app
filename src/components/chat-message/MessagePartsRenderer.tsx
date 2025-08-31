import MarkdownRenderer from "../MarkdownRenderer"
import { ContentV2 } from "@/api/getMemories"

interface MessagePartsRendererProps {
  parts: ContentV2[]
  isOptimistic: boolean
  keyPrefix: string
}

const MessagePartsRenderer: React.FC<MessagePartsRendererProps> = ({
  parts,
  isOptimistic,
  keyPrefix,
}) => {
  const renderPart = (part: ContentV2, index: number) => {
    const key = `${keyPrefix}-${index}`

    switch (part.type) {
      case "text":
        return <MarkdownRenderer key={key}>{part.content}</MarkdownRenderer>
      case "image":
        return (
          <img
            key={key}
            src={part.content}
            alt={`${keyPrefix} image`}
            className="rounded-md border border-border max-w-full"
            draggable={false}
          />
        )
      case "application/pdf":
        return (
          <a
            key={key}
            href={part.content}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline"
          >
            Attached PDF
          </a>
        )
      default:
        return null
    }
  }

  return (
    <div className="mb-2 space-y-2">
      {parts.map((p, i) => renderPart(p, i))}
    </div>
  )
}

export default MessagePartsRenderer
