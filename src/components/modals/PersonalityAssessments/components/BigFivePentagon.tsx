import { Badge } from "@/components/ui/badge"
import { BigFiveResults } from "../types/assessmentTypes"

interface BigFivePentagonProps {
  results: BigFiveResults
}

export const BigFivePentagon = ({ results }: BigFivePentagonProps) => {
  const dimensions = Object.entries(results.dimension_scores || {})
  const size = 120
  const center = size / 2
  const radius = 35

  const getPolygonPoints = (scores: number[]) => {
    return scores
      .map((score, index) => {
        const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2
        const value = (score / 5) * radius
        const x = center + value * Math.cos(angle)
        const y = center + value * Math.sin(angle)
        return `${x},${y}`
      })
      .join(" ")
  }

  const getOutlinePoints = () => {
    const points = []
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
      const x = center + radius * Math.cos(angle)
      const y = center + radius * Math.sin(angle)
      points.push(`${x},${y}`)
    }
    return points.join(" ")
  }

  const getDimensionLabel = (key: string) => {
    const labels: { [key: string]: string } = {
      openness: "O",
      conscientiousness: "C",
      extraversion: "E",
      agreeableness: "A",
      neuroticism: "N",
    }
    return labels[key] || key.charAt(0).toUpperCase()
  }

  const scores = dimensions.map(([_, dim]) => dim.score)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        className="drop-shadow-sm"
        role="img"
        aria-label={`Big Five personality pentagon showing scores: ${dimensions.map(([key, dim]) => `${key}: ${dim.score.toFixed(1)}`).join(", ")}`}
      >
        <title>Big Five Personality Pentagon Chart</title>

        {/* Grid lines */}
        <polygon
          points={getOutlinePoints()}
          fill="none"
          stroke="rgb(203 213 225)"
          strokeWidth="1"
          className="opacity-30"
        />

        {/* Data polygon */}
        <polygon
          points={getPolygonPoints(scores)}
          fill="rgb(59 130 246)"
          fillOpacity="0.3"
          stroke="rgb(59 130 246)"
          strokeWidth="2"
        />

        {/* Dimension labels */}
        {dimensions.map(([key, _dim], index) => {
          const angle = (index * 2 * Math.PI) / 5 - Math.PI / 2
          const labelRadius = radius + 15
          const x = center + labelRadius * Math.cos(angle)
          const y = center + labelRadius * Math.sin(angle)

          return (
            <text
              key={key}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-current"
            >
              {getDimensionLabel(key)}
            </text>
          )
        })}

        {/* Center dot */}
        <circle cx={center} cy={center} r="2" fill="rgb(59 130 246)" />
      </svg>

      <div className="flex flex-wrap gap-1 justify-center text-xs">
        {dimensions.map(([key, dim]) => (
          <Badge key={key} variant="outline" className="text-xs px-1.5 py-0.5">
            {getDimensionLabel(key)}: {dim.score.toFixed(1)}
          </Badge>
        ))}
      </div>
    </div>
  )
}
