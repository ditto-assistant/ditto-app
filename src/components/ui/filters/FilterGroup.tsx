import React from "react"

interface FilterGroupProps {
  label: string
  children: React.ReactNode
  className?: string
}

export const FilterGroup: React.FC<FilterGroupProps> = ({
  label,
  children,
  className = "",
}) => {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
