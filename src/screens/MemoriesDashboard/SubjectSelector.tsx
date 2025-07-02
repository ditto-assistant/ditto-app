import React from "react"
import { Edit2, Check, X } from "lucide-react"
import type { Subject } from "@/types/common"
import { renameSubject } from "@/api/kg"
import { toast } from "sonner"

interface SubjectSelectorProps {
  subjects: Subject[]
  loading: boolean
  error?: string | null
  selectedSubjectId?: string | null
  onSelect: (subject: Subject) => void
  onSearch: (query: string) => void
  onShowMore?: () => void
  hasMore?: boolean
  showMoreLoading?: boolean
  isSearchMode?: boolean
  onResetSearch?: () => void
  userID?: string
  onSubjectUpdated?: (updatedSubject: Subject) => void
}

const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  subjects,
  loading,
  error,
  selectedSubjectId,
  onSelect,
  onSearch,
  onShowMore,
  hasMore,
  showMoreLoading,
  isSearchMode,
  onResetSearch,
  userID,
  onSubjectUpdated,
}) => {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [editingSubjectId, setEditingSubjectId] = React.useState<string | null>(
    null
  )
  const [editingText, setEditingText] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [touchTimer, setTouchTimer] = React.useState<number | null>(null)

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchTerm)
  }

  const handleReset = () => {
    setSearchTerm("")
    if (onResetSearch) {
      onResetSearch()
    }
  }

  const startEditing = (subject: Subject) => {
    setEditingSubjectId(subject.id)
    setEditingText(subject.subject_text)
  }

  const cancelEditing = () => {
    setEditingSubjectId(null)
    setEditingText("")
  }

  const saveEdit = async () => {
    if (!editingSubjectId || !editingText.trim() || !userID) return

    setSaving(true)
    try {
      const result = await renameSubject({
        userID,
        subjectId: editingSubjectId,
        newSubjectText: editingText.trim(),
      })

      if (result.err) {
        toast.error(`Failed to rename subject: ${result.err}`)
        return
      }

      if (result.ok) {
        toast.success("Subject renamed successfully!")

        // Update the subject in the parent component
        if (onSubjectUpdated) {
          onSubjectUpdated(result.ok.subject)
        }

        cancelEditing()
      }
    } catch (error) {
      toast.error("Failed to rename subject")
      console.error("Error renaming subject:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleTouchStart = (subject: Subject) => {
    const timer = setTimeout(() => {
      startEditing(subject)
    }, 1000) // 1000ms long press for better accessibility
    setTouchTimer(timer)
  }

  const handleTouchEnd = () => {
    if (touchTimer) {
      clearTimeout(touchTimer)
      setTouchTimer(null)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEdit()
    } else if (e.key === "Escape") {
      cancelEditing()
    }
  }

  return (
    <div className="subject-selector flex flex-col gap-2">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInput}
          placeholder="Search subjects..."
          className="flex-1 px-3 py-2 rounded border border-input bg-muted text-foreground text-sm focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
          disabled={loading}
        >
          {loading ? "Searching..." : "Search"}
        </button>
        {isSearchMode && onResetSearch && (
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded bg-muted text-foreground border border-border hover:bg-muted/80 text-sm font-medium"
          >
            Reset
          </button>
        )}
      </form>
      {error && <div className="text-destructive text-sm mt-1">{error}</div>}
      <div className="max-h-48 overflow-y-auto">
        <div className="flex flex-wrap gap-2 mt-2">
          {subjects.map((subject) => (
            <div key={subject.id} className="relative">
              {editingSubjectId === subject.id ? (
                // Editing mode
                <div className="flex items-center gap-1 px-3 py-1 rounded-full border bg-background border-primary">
                  <input
                    type="text"
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="text-sm font-medium bg-transparent border-none outline-none min-w-[100px] max-w-[200px]"
                    autoFocus
                    disabled={saving}
                  />
                  <button
                    onClick={saveEdit}
                    disabled={saving || !editingText.trim()}
                    className="p-1 rounded text-green-600 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save"
                    aria-label="Save subject name changes"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={cancelEditing}
                    disabled={saving}
                    className="p-1 rounded text-red-600 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Cancel"
                    aria-label="Cancel editing subject name"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                // Normal mode
                <button
                  className={`px-3 py-1 rounded-full border text-sm font-medium transition-colors relative group
                    ${
                      selectedSubjectId === subject.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:bg-muted"
                    }
                  `}
                  onClick={() => onSelect(subject)}
                  onTouchStart={() => handleTouchStart(subject)}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  type="button"
                  title="Click to select • Long press to rename"
                  aria-label={`Select subject: ${subject.subject_text}${subject.pair_count !== undefined ? `, ${subject.pair_count} pairs` : ""}`}
                >
                  {subject.subject_text}
                  {subject.pair_count !== undefined && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({subject.pair_count})
                    </span>
                  )}

                  {/* Edit icon on hover (desktop) */}
                  <Edit2
                    size={12}
                    className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded-full p-1 w-5 h-5 text-muted-foreground hidden md:block cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      startEditing(subject)
                    }}
                    aria-label={`Edit subject: ${subject.subject_text}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        e.stopPropagation()
                        startEditing(subject)
                      }
                    }}
                  />
                </button>
              )}
            </div>
          ))}
          {/* Show more button as a pill */}
          {!isSearchMode && hasMore && onShowMore && (
            <button
              type="button"
              onClick={onShowMore}
              disabled={showMoreLoading}
              className="px-3 py-1 rounded-full border text-sm font-medium transition-colors bg-background text-primary border-primary/30 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showMoreLoading ? "Loading..." : "+ Show More"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SubjectSelector
