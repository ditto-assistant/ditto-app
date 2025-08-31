import React, { useState } from "react"
import { Copy, Trash, Tags, Loader2, Network } from "lucide-react"
import { cn } from "@/lib/utils"
import { triggerHaptic, HapticPattern } from "@/lib/haptics"
import { getSubjectsForPairs, SubjectWithCount } from "@/api/subjects"
import { toast } from "sonner"
import ReadAloudButton from "../ReadAloudButton"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface MessageActionsProps {
  isUser: boolean
  pairID: string
  showSyncIndicator: boolean
  hideActions: {
    delete?: boolean
    memories?: boolean
    subjects?: boolean
  }
  onCopy: () => void
  onDelete: () => void
  onShowMemories: () => void
}

const MessageActions: React.FC<MessageActionsProps> = ({
  isUser,
  pairID,
  showSyncIndicator,
  hideActions,
  onCopy,
  onDelete,
  onShowMemories,
}) => {
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([])
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false)
  const [errorSubjects, setErrorSubjects] = useState<string | null>(null)

  const handleFetchSubjects = async () => {
    setIsLoadingSubjects(true)
    setErrorSubjects(null)

    const result = await getSubjectsForPairs([pairID])

    if (result.ok) {
      const subjectsForPair = result.ok.get(pairID) || []
      setSubjects(subjectsForPair)
      if (subjectsForPair.length === 0) {
        toast.info("No subjects found for this memory.")
      }
    } else {
      const errorMsg = result.err ?? "An unknown error occurred."
      setErrorSubjects(errorMsg)
      toast.error(`Failed to get subjects: ${errorMsg}`)
    }

    setIsLoadingSubjects(false)
  }

  const triggerLightHaptic = () => triggerHaptic(HapticPattern.Light)

  return (
    <div className="flex items-center gap-1.5">
      {!hideActions.subjects && (
        <DropdownMenu
          onOpenChange={(open) => {
            if (open && !showSyncIndicator) {
              handleFetchSubjects()
            }
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 text-foreground/70 hover:bg-background/20",
                showSyncIndicator && "opacity-50 cursor-not-allowed"
              )}
              aria-label="View linked subjects"
              disabled={showSyncIndicator}
            >
              {isLoadingSubjects ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Tags className="h-5 w-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60">
            <DropdownMenuLabel>Linked Subjects</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2 space-y-2">
              {errorSubjects && (
                <p className="text-xs text-destructive">{errorSubjects}</p>
              )}
              {subjects.length > 0
                ? subjects.map((s, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {s.subject_text}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {s.pair_count} pairs
                      </span>
                    </div>
                  ))
                : !errorSubjects &&
                  !isLoadingSubjects && (
                    <p className="text-xs text-muted-foreground">
                      No subjects found.
                    </p>
                  )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Read Aloud button - for both user and bot messages */}
      <ReadAloudButton
        pairID={pairID}
        target={isUser ? "prompt" : "response"}
        size="md"
        variant="ghost"
        className="h-8 w-8"
      />

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-foreground/70 hover:bg-background/20"
        onClick={() => {
          triggerLightHaptic()
          onCopy()
        }}
        aria-label="Copy message"
      >
        <Copy className="h-5 w-5" />
      </Button>

      {!hideActions.memories && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-foreground/70 hover:bg-background/20"
          onClick={() => {
            triggerLightHaptic()
            onShowMemories()
          }}
          aria-label="Show memory graph"
        >
          <Network className="h-5 w-5" />
        </Button>
      )}

      {!hideActions.delete && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-foreground/70 hover:bg-background/20",
            showSyncIndicator
              ? "opacity-50 cursor-not-allowed"
              : "hover:text-destructive"
          )}
          onClick={() => {
            if (!showSyncIndicator) {
              triggerLightHaptic()
              onDelete()
            }
          }}
          disabled={showSyncIndicator}
          aria-label="Delete message"
        >
          <Trash className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}

export default MessageActions
