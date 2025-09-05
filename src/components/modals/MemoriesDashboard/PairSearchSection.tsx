import React from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import MemoriesListView from "./MemoriesListView"
import type { Subject, Pair } from "@/types/common"
import { Memory } from "@/api/getMemories"

interface PairSearchSectionProps {
  selectedSubject: Subject
  pairs: Pair[]
  pairsLoading: boolean
  pairsError: string | null
  hasMorePairs: boolean
  isLoadingMorePairs: boolean
  onPairSearch: (query: string) => void
  onLoadMorePairs: () => void
  onCopy: (memory: Memory, type: "prompt" | "response") => void
  onDelete: (memory: Memory) => void
  onShowMemories: (memory: Memory) => void
}

export default function PairSearchSection({
  selectedSubject,
  pairs,
  pairsLoading,
  pairsError,
  hasMorePairs,
  isLoadingMorePairs,
  onPairSearch,
  onLoadMorePairs,
  onCopy,
  onDelete,
  onShowMemories,
}: PairSearchSectionProps) {
  return (
    <div className="flex flex-col flex-1 gap-4">
      <div className="flex flex-col gap-4 pb-4 border-b border-border">
        <form
          className="flex gap-3 w-full"
          onSubmit={(e) => {
            e.preventDefault()
            const input = e.currentTarget.elements.namedItem(
              "pairSearch"
            ) as HTMLInputElement
            onPairSearch(input.value)
          }}
          autoComplete="off"
        >
          <input
            name="pairSearch"
            type="text"
            placeholder={`Search memories in '${selectedSubject.subject_text}'...`}
            className="flex-1 px-3 py-2 rounded border border-input bg-muted text-foreground text-sm focus:outline-none focus:border-primary"
            disabled={pairsLoading}
          />
          <Button
            type="submit"
            disabled={pairsLoading}
            className="h-10 px-4 rounded-md text-base font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/70 disabled:cursor-not-allowed"
          >
            {pairsLoading ? "Searching..." : "Search"}
          </Button>
        </form>
        {pairsError && (
          <div className="text-destructive text-sm mt-1">{pairsError}</div>
        )}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {!pairsLoading && pairs.length > 0 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <MemoriesListView
              memories={pairs.sort((a, b) => {
                // Always maintain chronological order (newest first) for pairs in a subject
                // Backend already returns them in chronological order, but ensure consistency
                const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0
                const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0
                return bTime - aTime
              })}
              onCopy={onCopy}
              onDelete={onDelete}
              onShowMemories={onShowMemories}
            />
            {/* Load more pairs button */}
            {hasMorePairs && (
              <div className="flex justify-center p-4 border-t border-border">
                <button
                  type="button"
                  onClick={onLoadMorePairs}
                  disabled={isLoadingMorePairs}
                  className="px-6 py-2 rounded-md text-sm font-medium text-primary border border-primary/30 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoadingMorePairs ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Loading older memories...
                    </span>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}

            {/* Show when no more pairs available */}
            {!hasMorePairs && pairs.length > 0 && (
              <div className="flex justify-center p-4 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  No more memories to load
                </span>
              </div>
            )}
          </div>
        )}
        {!pairsLoading && pairs.length === 0 && !pairsError && (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Info size={24} />
            </div>
            <p className="text-center">
              No memory pairs found for this subject.
            </p>
          </div>
        )}
        {pairsLoading && (
          <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground gap-3">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-lg">Loading recent memories...</p>
            <p className="text-sm text-muted-foreground/70">
              Fetching memories chronologically (newest first)
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
