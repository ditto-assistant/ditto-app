import React, { useState, useCallback, useRef, useEffect } from "react"
import { Zap, Info } from "lucide-react"
import { useUser } from "@/hooks/useUser"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface MemorySliderProps {
  label: string
  values: number[]
  onChange: (newValues: number[]) => void
  min?: number
  max?: number
  step?: number
  debounceMs?: number
  onInfoClick?: () => void
  showLongTermLevels?: boolean
  minimumTier?: number
}

function useDebounce<T>(
  callback: (...args: T[]) => void,
  delay: number
): [(...args: T[]) => void, boolean] {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const debouncedCallback = useCallback(
    (...args: T[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsSaving(true)
      timeoutRef.current = setTimeout(() => {
        callback(...args)
        setIsSaving(false)
        console.log("debouncedCallback", args)
      }, delay)
    },
    [callback, delay]
  )

  return [debouncedCallback, isSaving]
}

export const MemorySlider: React.FC<MemorySliderProps> = ({
  label,
  values,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  debounceMs = 500,
  onInfoClick,
  showLongTermLevels = false,
  minimumTier,
}) => {
  const { data: user } = useUser()
  const [localValues, setLocalValues] = useState<number[]>(values)

  // Debounced callback to avoid spamming the API. Only called on *commit*.
  const [debouncedOnChange, isSaving] = useDebounce(onChange, debounceMs)

  // Keep local state in sync if parent props change (e.g. external reset)
  useEffect(() => {
    setLocalValues(values)
  }, [values])

  const isLocked =
    minimumTier !== undefined && (user?.planTier || 0) < minimumTier

  /**
   * Fires on every slide movement – updates local UI only.
   * We purposefully do *not* call the debounced API hook here to
   * keep the component snappy while dragging.
   */
  const handleSlideChange = useCallback(
    (index: number) => (newValue: number[]) => {
      const value = newValue[0]
      // Functional update to avoid stale closures
      setLocalValues((prev) => {
        const next = [...prev]
        next[index] = value
        return next
      })
    },
    []
  )

  /**
   * Fires once the user releases the thumb. This is the place to
   * propagate the change upstream (debounced).
   */
  const handleSlideCommit = useCallback(
    (index: number) => (newValue: number[]) => {
      const value = newValue[0]
      setLocalValues((prev) => {
        const next = [...prev]
        next[index] = value
        // Debounce API call on commit only
        debouncedOnChange(next)
        return next
      })
    },
    [debouncedOnChange]
  )

  // Ensure we always have exactly 2 values for long-term memory
  const displayValues = showLongTermLevels
    ? [...localValues.slice(0, 2), ...(localValues.length < 2 ? [0] : [])]
    : localValues

  return (
    <div
      className={cn(
        "p-4 mb-4 rounded-lg bg-muted/50 relative",
        isLocked && "opacity-50"
      )}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{label}</span>
          {onInfoClick && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                onInfoClick()
              }}
            >
              <Info className="h-4 w-4" />
            </Button>
          )}
        </div>
        {!showLongTermLevels && (
          <span
            className={cn(
              "font-mono px-2 py-1 bg-muted rounded text-sm transition-opacity",
              isSaving && "opacity-50"
            )}
          >
            {localValues[0]}
          </span>
        )}
      </div>

      {showLongTermLevels && (
        <div className="bg-muted/50 p-2 rounded-md mb-3 flex justify-end">
          <div className="flex items-center font-mono text-sm text-foreground">
            <span className={cn(isSaving && "opacity-50")}>
              Level 1: <span className="font-semibold">{displayValues[0]}</span>
              <span className="mx-2 text-muted-foreground">→</span>
              Level 2: <span className="font-semibold">{displayValues[1]}</span>
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {(showLongTermLevels ? displayValues : localValues).map(
          (value, index) => (
            <div key={index} className="flex items-center gap-3">
              {showLongTermLevels && (
                <div className="text-sm text-muted-foreground min-w-[60px]">
                  Level {index + 1}
                </div>
              )}
              <Slider
                key={`memory-slider-${index}`}
                defaultValue={[value]}
                onValueChange={handleSlideChange(index)}
                onValueCommit={handleSlideCommit(index)}
                min={min}
                max={max}
                step={step}
                disabled={isLocked}
                className="flex-1"
              />
            </div>
          )
        )}
      </div>

      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg cursor-pointer bg-black/5 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 bg-background/80 py-2 px-4 rounded-md">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">Upgrade required</span>
          </div>
        </div>
      )}
    </div>
  )
}
