import React from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
  onSearch: () => void
  inputRef: React.RefObject<HTMLInputElement | null>
  loading: boolean
  currentQuery: string
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  inputRef,
  loading,
  currentQuery,
}) => {
  const [inputValue, setInputValue] = React.useState(currentQuery)

  React.useEffect(() => {
    setInputValue(currentQuery)
    if (inputRef.current) {
      inputRef.current.value = currentQuery
    }
  }, [currentQuery, inputRef])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch()
  }

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    setInputValue(e.currentTarget.value)
  }

  const handleClear = () => {
    if (inputRef.current) {
      inputRef.current.value = ""
      setInputValue("")
      inputRef.current.focus()
    }
  }

  return (
    <form
      className="flex gap-3 w-full"
      onSubmit={handleSubmit}
      autoComplete="off"
    >
      <div className="flex-1">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search your memories..."
            onInput={handleInput}
            className="pl-10 pr-10 py-2 rounded-md bg-muted border border-input text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-colors"
          />
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted-foreground/10 focus:outline-none"
              tabIndex={-1}
              aria-label="Clear search input"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      <Button
        type="submit"
        disabled={loading}
        className="h-10 px-4 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/70 disabled:cursor-not-allowed"
      >
        {loading ? "Searching..." : "Search"}
      </Button>
    </form>
  )
}

export default SearchBar
