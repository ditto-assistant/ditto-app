import React, { useState, useCallback, useRef, useEffect } from "react"
import { Plus, Minus, Zap, Info } from "lucide-react"
import { useUser } from "@/hooks/useUser"
import { Slider } from "@/components/ui/slider"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface MemorySliderProps {
  label: string
  values: number[]
  onChange: (newValues: number[]) => void
  min?: number
  max?: number
  step?: number
  debounceMs?: number
  description?: string
  tooltip?: string
  showChainControls?: boolean
  maxChainLength?: number
  minimumTier?: number
  marks?: { value: number; label: string }[]
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
  description,
  tooltip,
  showChainControls = false,
  maxChainLength = 3,
  minimumTier,
  marks,
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

  const handleAddChain = useCallback(() => {
    if (localValues.length < maxChainLength) {
      const newValues = [
        ...localValues,
        localValues[localValues.length - 1] || 5,
      ]
      setLocalValues(newValues)
      debouncedOnChange(newValues)
    }
  }, [localValues, debouncedOnChange, maxChainLength])

  const handleRemoveChain = useCallback(() => {
    if (localValues.length > 1) {
      const newValues = localValues.slice(0, -1)
      setLocalValues(newValues)
      debouncedOnChange(newValues)
    }
  }, [localValues, debouncedOnChange])

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
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
            </Tooltip>
          )}
          {!showChainControls && (
            <span
              className={cn(
                "font-mono px-2 py-1 bg-muted rounded text-sm transition-opacity ml-auto",
                isSaving && "opacity-50"
              )}
            >
              {localValues[0]}
            </span>
          )}
        </div>
      </div>

      {description && (
        <div className="text-sm text-muted-foreground mb-4">{description}</div>
      )}

      {showChainControls && (
        <div className="bg-muted/50 p-3 rounded-lg mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Chain Levels:
              </span>
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((index) => {
                  const isActive = index < localValues.length
                  const canAdd =
                    index === localValues.length && index <= maxChainLength
                  const canRemove =
                    index === localValues.length - 1 && localValues.length > 1

                  return (
                    <button
                      key={index}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                        index === 0 && "cursor-default",
                        (canAdd || canRemove) &&
                          !isLocked &&
                          "hover:bg-muted-foreground/20 cursor-pointer",
                        isLocked && "cursor-not-allowed"
                      )}
                      onClick={() => {
                        if (index === 0 || isLocked) return

                        if (canRemove) {
                          // Remove this level
                          handleRemoveChain()
                        } else if (canAdd) {
                          // Add a new level
                          handleAddChain()
                        }
                      }}
                      disabled={index === 0 || isLocked}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center font-mono text-sm">
              <span
                className={cn(
                  "text-muted-foreground",
                  isSaving && "opacity-50"
                )}
              >
                {localValues.map((v, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="mx-1">→</span>}
                    <span className="text-foreground font-semibold">{v}</span>
                  </React.Fragment>
                ))}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {localValues.map((value, index) => (
          <div key={index} className="flex items-center gap-3">
            {showChainControls && (
              <div className="text-sm text-muted-foreground min-w-[50px]">
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
        ))}
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
