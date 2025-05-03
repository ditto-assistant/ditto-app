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
    <div className={`filter-group ${className}`}>
      <span className="filter-label">{label}</span>
      <div className="filter-buttons">{children}</div>
    </div>
  )
}
