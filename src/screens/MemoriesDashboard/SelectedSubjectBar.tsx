import React from "react"
import { Edit2 } from "lucide-react"
import type { Subject } from "@/types/common"

interface SelectedSubjectBarProps {
  selectedSubject: Subject
  editingSelectedSubject: boolean
  editingText: string
  savingEdit: boolean
  onEditingTextChange: (text: string) => void
  onKeyPress: (e: React.KeyboardEvent) => void
  onStartEditing: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onClearSubject: () => void
}

export default function SelectedSubjectBar({
  selectedSubject,
  editingSelectedSubject,
  editingText,
  savingEdit,
  onEditingTextChange,
  onKeyPress,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onClearSubject,
}: SelectedSubjectBarProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-medium text-primary">Selected:</span>
        {editingSelectedSubject ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editingText}
              onChange={(e) => onEditingTextChange(e.target.value)}
              onKeyDown={onKeyPress}
              className="text-sm bg-background border border-border rounded px-2 py-1 flex-1 max-w-[200px]"
              autoFocus
              disabled={savingEdit}
            />
            <button
              onClick={onSaveEdit}
              disabled={savingEdit || !editingText.trim()}
              className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingEdit ? "Saving..." : "Save"}
            </button>
            <button
              onClick={onCancelEdit}
              disabled={savingEdit}
              className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <span className="text-sm text-foreground">
              {selectedSubject.subject_text}
            </span>
            {selectedSubject.pair_count && (
              <span className="text-xs text-muted-foreground">
                ({selectedSubject.pair_count} pairs)
              </span>
            )}
          </>
        )}
      </div>
      {!editingSelectedSubject && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-muted transition-colors flex items-center gap-1"
            onClick={onStartEditing}
            title="Edit subject name"
          >
            <Edit2 size={12} />
            Edit
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 rounded bg-background border border-border hover:bg-muted transition-colors"
            onClick={onClearSubject}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}