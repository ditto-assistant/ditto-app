import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  onValueCommit,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  // Create a custom handler for value commit (when user releases the slider)
  const handleValueCommit = (values: number[]) => {
    // Vibrate when value is committed to provide tactile feedback
    navigator.vibrate?.(10)

    // Call the original handler if it exists
    onValueCommit?.(values)
  }

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      onValueCommit={handleValueCommit}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "glass-interactive relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
          style={{
            background: "linear-gradient(98deg, #9966ff 0%, #ff6eb2 50%, #ffad66 100%)"
          }}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="glass-interactive-light border-ditto-glass-border-strong block size-4 shrink-0 rounded-full border-2 shadow-lg transition-all hover:scale-110 hover:shadow-xl focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
          style={{
            boxShadow: "0 0 0 0px rgba(139, 92, 246, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 0 0 4px rgba(139, 92, 246, 0.3), 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "0 0 0 0px rgba(139, 92, 246, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
          }}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
