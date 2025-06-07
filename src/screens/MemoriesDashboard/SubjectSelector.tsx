import React from "react"
import type { Subject } from "@/types/common"

interface SubjectSelectorProps {
  subjects: Subject[]
  loading: boolean
  error?: string | null
  selectedSubjectId?: string | null
  onSelect: (subject: Subject) => void
  onSearch: (query: string) => void
}

const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  subjects,
  loading,
  error,
  selectedSubjectId,
  onSelect,
  onSearch,
}) => {
  const [searchTerm, setSearchTerm] = React.useState("")

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(searchTerm)
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
      </form>
      {error && (
        <div className="text-destructive text-sm mt-1">{error}</div>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {subjects.map((subject) => (
          <button
            key={subject.id}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-colors
              ${selectedSubjectId === subject.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"}
            `}
            onClick={() => onSelect(subject)}
            type="button"
          >
            {subject.subject_text}
            {subject.pair_count !== undefined && (
              <span className="ml-2 text-xs text-muted-foreground">({subject.pair_count})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SubjectSelector 