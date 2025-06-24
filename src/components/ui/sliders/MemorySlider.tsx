import React, { useState, useCallback, useRef, useEffect } from "react"
import { Plus, Minus, Zap } from "lucide-react"
import { useUser } from "@/hooks/useUser"
import { Slider } from "@/components/ui/slider"
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
  showChainControls?: boolean
  maxChainLength?: number
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
  description,
  showChainControls = false,
  maxChainLength = 3,
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
        "p-4 mb-4 rounded-lg glass-interactive-light relative",
        isLocked && "opacity-50"
      )}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-ditto-primary">{label}</span>
          {!showChainControls && (
            <span
              className={cn(
                "font-mono px-2 py-1 glass-interactive-light rounded text-sm transition-opacity text-ditto-primary",
                isSaving && "opacity-50"
              )}
            >
              {localValues[0]}
            </span>
          )}
        </div>
      </div>

      {description && (
        <div className="text-sm text-ditto-secondary mb-4">{description}</div>
      )}

      {showChainControls && (
        <div className="glass-interactive-light p-3 rounded-md mb-4 flex justify-between items-center">
          <div className="flex items-center font-mono text-base text-ditto-primary">
            <span className={cn(isSaving && "opacity-50")}>
              {localValues.map((v, i) => (
                                  <React.Fragment key={i}>
                    {i > 0 && (
                      <span className="mx-2 text-ditto-secondary">→</span>
                    )}
                    <span className="glass-interactive-light px-2 py-1 rounded min-w-[2ch] text-center text-ditto-primary">
                      {v}
                    </span>
                  </React.Fragment>
              ))}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded glass-interactive-light text-ditto-secondary transition-colors",
                "hover:text-ditto-primary disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              onClick={handleRemoveChain}
              disabled={localValues.length <= 1 || isLocked}
              title="Remove last chain level"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded glass-interactive-light text-ditto-secondary transition-colors",
                "hover:text-ditto-primary disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              onClick={handleAddChain}
              disabled={localValues.length >= maxChainLength || isLocked}
              title="Add chain level"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {localValues.map((value, index) => (
          <div key={index} className="flex items-center gap-4">
            {showChainControls && (
              <div className="text-sm text-ditto-secondary min-w-[60px]">
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
          <div className="flex items-center gap-2 glass-interactive-light py-2 px-4 rounded-md">
            <Zap className="h-4 w-4 text-ditto-gradient" />
            <span className="text-sm text-ditto-primary">Upgrade required</span>
          </div>
        </div>
      )}
    </div>
  )
}
