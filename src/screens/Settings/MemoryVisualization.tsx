import React, { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface MemoryVisualizationProps {
  shortTermCount: number
  longTermLevel1: number
  longTermLevel2: number
  className?: string
}

export const MemoryVisualization: React.FC<MemoryVisualizationProps> = ({
  shortTermCount,
  longTermLevel1,
  longTermLevel2,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Colors
    const centerNodeColor = "#3b82f6" // blue-500
    const shortTermColor = "#10b981" // emerald-500
    const longTermColor = "#8b5cf6" // purple-500

    // Dimensions
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const centerRadius = 28
    const nodeRadius = 8
    const smallNodeRadius = 6

    // Draw center node as chat bubble
    ctx.beginPath()
    const bubbleRadius = centerRadius
    const tailSize = 8

    // Main bubble
    ctx.arc(centerX, centerY, bubbleRadius, 0, 2 * Math.PI)
    ctx.fillStyle = centerNodeColor
    ctx.fill()
    ctx.strokeStyle = "#1e40af"
    ctx.lineWidth = 2
    ctx.stroke()

    // Chat bubble tail
    ctx.beginPath()
    ctx.moveTo(centerX - bubbleRadius * 0.5, centerY + bubbleRadius * 0.7)
    ctx.lineTo(centerX - bubbleRadius * 0.3, centerY + bubbleRadius)
    ctx.lineTo(centerX - bubbleRadius * 0.7, centerY + bubbleRadius + tailSize)
    ctx.closePath()
    ctx.fillStyle = centerNodeColor
    ctx.fill()
    ctx.strokeStyle = "#1e40af"
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw chat dots inside
    ctx.fillStyle = "white"
    const dotRadius = 3
    const dotSpacing = 10
    ctx.beginPath()
    ctx.arc(centerX - dotSpacing, centerY, dotRadius, 0, 2 * Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(centerX, centerY, dotRadius, 0, 2 * Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(centerX + dotSpacing, centerY, dotRadius, 0, 2 * Math.PI)
    ctx.fill()

    // Draw short-term memory nodes (stacked pattern on left)
    if (shortTermCount > 0) {
      const baseX = centerX - centerRadius - 60
      const baseY = centerY

      // Draw connecting line
      ctx.beginPath()
      ctx.moveTo(centerX - centerRadius, centerY)
      ctx.lineTo(baseX + nodeRadius, baseY)
      ctx.strokeStyle = shortTermColor
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw all short-term nodes as overlapping stack
      const stackOffset = 3 // Pixels between stacked cards
      const totalStackWidth = (shortTermCount - 1) * stackOffset
      const startX = baseX - totalStackWidth / 2

      for (let i = 0; i < shortTermCount; i++) {
        const nodeX = startX + i * stackOffset
        const nodeY = baseY

        // Add slight shadow for depth
        if (i < shortTermCount - 1) {
          ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
          ctx.fillRect(
            nodeX - nodeRadius + 1,
            nodeY - nodeRadius + 1,
            nodeRadius * 2,
            nodeRadius * 2
          )
        }

        // Draw node
        ctx.beginPath()
        ctx.rect(
          nodeX - nodeRadius,
          nodeY - nodeRadius,
          nodeRadius * 2,
          nodeRadius * 2
        )
        ctx.fillStyle = shortTermColor
        ctx.fill()
        ctx.strokeStyle = "#047857"
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    // Draw long-term memory Level 1 nodes (right side)
    if (longTermLevel1 > 0) {
      const level1Distance = 100
      const angleSpread = Math.PI / 2.5 // Wider spread
      const startAngle = -angleSpread / 2

      for (let i = 0; i < longTermLevel1; i++) {
        const angle =
          startAngle + (angleSpread / Math.max(1, longTermLevel1 - 1)) * i
        const nodeX = centerX + level1Distance * Math.cos(angle)
        const nodeY = centerY + level1Distance * Math.sin(angle)

        // Draw connecting line
        ctx.beginPath()
        ctx.moveTo(
          centerX + centerRadius * Math.cos(angle),
          centerY + centerRadius * Math.sin(angle)
        )
        ctx.lineTo(nodeX, nodeY)
        ctx.strokeStyle = longTermColor
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Draw Level 1 node
        ctx.beginPath()
        ctx.arc(nodeX, nodeY, nodeRadius, 0, 2 * Math.PI)
        ctx.fillStyle = longTermColor
        ctx.fill()
        ctx.strokeStyle = "#7c3aed"
        ctx.lineWidth = 1
        ctx.stroke()

        // Draw Level 2 nodes connected to this Level 1 node
        if (longTermLevel2 > 0) {
          const level2Distance = 50
          const level2AngleSpread = Math.PI / 3
          const level2StartAngle = angle - level2AngleSpread / 2

          for (let j = 0; j < longTermLevel2; j++) {
            const level2Angle =
              level2StartAngle +
              (level2AngleSpread / Math.max(1, longTermLevel2 - 1)) * j
            const node2X = nodeX + level2Distance * Math.cos(level2Angle)
            const node2Y = nodeY + level2Distance * Math.sin(level2Angle)

            // Draw connecting line to Level 2
            ctx.beginPath()
            ctx.moveTo(nodeX, nodeY)
            ctx.lineTo(node2X, node2Y)
            ctx.strokeStyle = longTermColor
            ctx.lineWidth = 1
            ctx.stroke()

            // Draw Level 2 node
            ctx.beginPath()
            ctx.arc(node2X, node2Y, smallNodeRadius, 0, 2 * Math.PI)
            ctx.fillStyle = longTermColor
            ctx.fill()
            ctx.strokeStyle = "#7c3aed"
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }
    }

    // Draw legend
    const legendY = rect.height - 20
    const legendItems = []

    if (shortTermCount > 0) {
      legendItems.push({
        color: shortTermColor,
        label: "Short Term",
        shape: "square",
      })
    }

    if (longTermLevel1 > 0 || longTermLevel2 > 0) {
      legendItems.push({
        color: longTermColor,
        label: "Long Term",
        shape: "circle",
      })
    }

    let legendX = 20
    ctx.font = "10px sans-serif"
    ctx.textAlign = "left"

    legendItems.forEach((item) => {
      // Draw legend item
      if (item.shape === "square") {
        ctx.fillStyle = item.color
        ctx.fillRect(legendX, legendY - 4, 8, 8)
      } else {
        ctx.beginPath()
        ctx.arc(legendX + 4, legendY, 4, 0, 2 * Math.PI)
        ctx.fillStyle = item.color
        ctx.fill()
      }

      ctx.fillStyle = "#6b7280"
      ctx.fillText(item.label, legendX + 14, legendY + 2)
      legendX += ctx.measureText(item.label).width + 35
    })
  }, [shortTermCount, longTermLevel1, longTermLevel2])

  return (
    <canvas
      ref={canvasRef}
      className={cn("w-full h-full", className)}
      style={{ minHeight: "200px" }}
    />
  )
}

export default MemoryVisualization
