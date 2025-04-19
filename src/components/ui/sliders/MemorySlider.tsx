import React, { useState, useCallback, useRef } from "react"
import { Slider } from "@mui/material"
import { IoAdd, IoRemove } from "react-icons/io5"
import { useUser } from "@/hooks/useUser"
import "./MemorySlider.css"

interface Mark {
  value: number
  label: string
}

interface MemorySliderProps {
  label: string
  values: number[]
  onChange: (newValues: number[]) => void
  min?: number
  max?: number
  step?: number
  debounceMs?: number
  description?: string
  marks?: readonly Mark[]
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
  marks,
  showChainControls = false,
  maxChainLength = 3,
  minimumTier,
}) => {
  const { data: user } = useUser()
  const [localValues, setLocalValues] = useState<number[]>(values)
  const [debouncedOnChange, isSaving] = useDebounce(onChange, debounceMs)

  const isLocked =
    minimumTier !== undefined && (user?.planTier || 0) < minimumTier

  const handleChange = useCallback(
    (index: number) => (_event: Event, newValue: number | number[]) => {
      const value = Array.isArray(newValue) ? newValue[0] : newValue
      const newValues = [...localValues]
      newValues[index] = value
      setLocalValues(newValues)
      debouncedOnChange(newValues)
    },
    [localValues, debouncedOnChange]
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
    <div className={`memory-slider ${isLocked ? "locked" : ""}`}>
      <div className="memory-slider-header">
        <div className="memory-slider-header-left">
          <span className="memory-slider-label">{label}</span>
          {!showChainControls && (
            <span
              className={`memory-slider-values ${isSaving ? "saving" : ""}`}
            >
              {localValues[0]}
            </span>
          )}
        </div>
      </div>

      {description && (
        <div className="memory-slider-description">{description}</div>
      )}

      {showChainControls && (
        <div className="memory-chain-visualization">
          <div className="chain-values">
            <span className={isSaving ? "saving" : ""}>
              {localValues.map((v, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="chain-arrow">→</span>}
                  <span className="chain-value">{v}</span>
                </React.Fragment>
              ))}
            </span>
          </div>
          <div className="chain-controls">
            <button
              className="chain-control-button"
              onClick={handleRemoveChain}
              disabled={localValues.length <= 1 || isLocked}
              title="Remove last chain level"
            >
              <IoRemove />
            </button>
            <button
              className="chain-control-button"
              onClick={handleAddChain}
              disabled={localValues.length >= maxChainLength || isLocked}
              title="Add chain level"
            >
              <IoAdd />
            </button>
          </div>
        </div>
      )}

      <div className="sliders-container">
        {localValues.map((value, index) => (
          <div key={index} className="slider-row">
            {showChainControls && (
              <div className="slider-level">Level {index + 1}</div>
            )}
            <Slider
              value={value}
              onChange={handleChange(index)}
              min={min}
              max={max}
              step={step}
              marks={marks as Mark[]}
              valueLabelDisplay="auto"
              aria-label={`${label} level ${index + 1}`}
              className="memory-slider-input"
              disabled={isLocked}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
