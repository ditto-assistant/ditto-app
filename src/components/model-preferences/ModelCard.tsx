// Main imports
import { LLMModel, ImageModel } from "@/api/services"
import { useModelPreferences } from "@/hooks/useModelPreferences"
import { Model, Vendor } from "@/types/llm"
import { IMAGE_GENERATION_SIZES } from "@/constants"
import { triggerHaptic, HapticPattern } from "@/utils/haptics"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  SiOpenai,
  SiGoogle,
  SiAnthropic,
  SiMeta,
} from "@icons-pack/react-simple-icons"
import {
  Bolt,
  Microchip,
  Info,
  ZapIcon,
  ImageIcon,
  CpuIcon,
  Flame,
  Clock,
  Zap,
  Rocket,
} from "lucide-react"
import { cn } from "@/lib/utils"
import React, { useMemo } from "react"
// Vendor color mappings for visual consistency
const VENDOR_COLORS: Record<Vendor, string> = {
  google: "#4285F4",
  openai: "#00A67E",
  anthropic: "#5436DA",
  mistral: "#7A88FF",
  meta: "#0668E1",
  cerebras: "#FF4B4B",
}

// Speed labels have been removed per requirements

const getSpeedIcon = (level: number) => {
  if (level <= 2) return <Clock className="h-3 w-3" />
  if (level <= 4) return <Zap className="h-3 w-3" />
  if (level <= 6) return <CpuIcon className="h-3 w-3" />
  if (level <= 8) return <Rocket className="h-3 w-3" />
  return <Flame className="h-3 w-3" style={{ color: "#FF0000" }} />
}

const getVendorIcon = (vendor: Vendor) => {
  switch (vendor) {
    case "google":
      return <SiGoogle />
    case "openai":
      return <SiOpenai />
    case "anthropic":
      return <SiAnthropic />
    case "mistral":
      return <Bolt />
    case "meta":
      return <SiMeta />
    case "cerebras":
      return <Microchip />
    default:
      return null
  }
}

// Function to check if model is accessible
const isModelAccessible = (
  model: LLMModel | ImageModel,
  userTier: number = 0
) => {
  // Special case for LLaMA 4 models - always accessible
  if (
    "costPerMillionInputTokens" in model &&
    model.name.toLowerCase().includes("llama-4")
  ) {
    return true
  }

  // Free models (no cost) are always accessible
  if (
    "costPerMillionInputTokens" in model &&
    (!model.costPerMillionInputTokens || model.costPerMillionInputTokens === 0)
  ) {
    return true
  }

  // Image models
  if (!("costPerMillionInputTokens" in model)) {
    return model.minimumTier ? userTier >= model.minimumTier : true
  }

  // Use plan tier to determine accessibility
  if (model.costPerMillionInputTokens > 30 && userTier < 3) return false
  if (model.costPerMillionInputTokens > 10 && userTier < 2) return false
  if (model.costPerMillionInputTokens > 0 && userTier < 1) return false

  return true
}

interface ModelCardProps {
  /** Optional override for the card title (defaults to model.modelFlavor) */
  title?: string
  model: LLMModel | ImageModel
  isSelected: boolean
  userTier: number
  onSelect: () => void
  onShowDetails: () => void
  type: "main" | "programmer" | "image"
  redirectToSubscription?: () => void
  /**
   * For image models, the list of all variants (different orientations/sizes)
   */
  variants?: ImageModel[]
}

export const ModelCard = ({
  title,
  model,
  isSelected,
  userTier,
  onSelect,
  onShowDetails,
  type,
  redirectToSubscription,
  variants,
}: ModelCardProps) => {
  const { preferences, updatePreferences } = useModelPreferences()

  const isAccessible = isModelAccessible(model, userTier)
  const isLLMModel = "costPerMillionInputTokens" in model

  // Compute supported sizes from passed variants, covering all orientations
  const supportedSizeVariants = useMemo(() => {
    if (isLLMModel || !variants) return []
    const uniqueSizes = Array.from(new Set(variants.map((m) => m.imageSize)))
    return uniqueSizes.map(
      (wh) => IMAGE_GENERATION_SIZES[wh] || { wh, description: wh }
    )
  }, [isLLMModel, variants])

  const handleSizeChange = (size: { wh: string; description: string }) => {
    if (isLLMModel || !preferences) return

    updatePreferences({
      imageGeneration: {
        model: model.name as Model,
        size,
      },
    })
  }

  return (
    <Card
      className={cn(
        "py-4 gap-2 overflow-hidden transition-all cursor-pointer h-full glass-card",
        isSelected
          ? "border-2 border-ditto-glass-border-strong gradient-ring"
          : "border hover:border-ditto-glass-border-strong",
        !isAccessible && "opacity-75"
      )}
      onClick={(e) => {
        e.stopPropagation()
        triggerHaptic(HapticPattern.Light)
        if (isAccessible) {
          onSelect()
        } else if (redirectToSubscription) {
          triggerHaptic(HapticPattern.Warning)
          redirectToSubscription()
        }
      }}
    >
      <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between space-y-0">
        <div className="flex-1 mr-2 overflow-hidden">
          <CardTitle className="text-base font-semibold truncate text-ditto-primary">
            {title ?? model.modelFlavor}
          </CardTitle>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-8 w-8 glass-interactive text-ditto-secondary hover:text-ditto-primary"
            onClick={(e) => {
              e.stopPropagation()
              triggerHaptic(HapticPattern.Light)
              onShowDetails()
            }}
          >
            <Info className="h-4 w-4" />
          </Button>

          {model.provider && (
            <Badge
              variant="outline"
              className="rounded-full glass-interactive text-ditto-primary border-ditto-glass-border"
            >
              {getVendorIcon(model.provider.toLowerCase() as Vendor)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-1 pb-2">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <Badge variant="secondary" className="flex items-center glass-interactive text-ditto-secondary">
            {getSpeedIcon(model.speedLevel)}
          </Badge>

          {isLLMModel && (model as LLMModel).attachableImageCount > 0 && (
            <Badge variant="secondary" className="flex items-center glass-interactive text-ditto-accent">
              <ImageIcon className="h-3 w-3" />
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-1 pb-2 flex justify-center items-center">
        {!isAccessible && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-sm font-medium gradient-ring text-ditto-primary gradient-shadow"
            onClick={(e) => {
              e.stopPropagation()
              triggerHaptic(HapticPattern.Warning)
              redirectToSubscription?.()
            }}
          >
            <ZapIcon className="h-3.5 w-3.5 mr-1.5" />
            {model.minimumTier >= 3
              ? "Upgrade to Hero"
              : model.minimumTier >= 2
                ? "Upgrade to Strong"
                : "Upgrade to Spark"}
          </Button>
        )}
      </CardFooter>

      {/* Size options for image models */}
      {type === "image" && isAccessible && variants && (
        <div className="border-t border-ditto-glass-border p-4">
          <h4 className="text-sm font-medium mb-2 text-ditto-primary">Size Options</h4>
          <div className="flex flex-wrap gap-2">
            {supportedSizeVariants.map((size) => (
              <Button
                key={size.wh}
                variant={
                  model.name === preferences?.imageGeneration?.model &&
                  preferences?.imageGeneration?.size?.wh === size.wh
                    ? "default"
                    : "outline"
                }
                size="sm"
                className={
                  model.name === preferences?.imageGeneration?.model &&
                  preferences?.imageGeneration?.size?.wh === size.wh
                    ? "gradient-ring text-ditto-primary"
                    : "glass-interactive text-ditto-secondary hover:text-ditto-primary"
                }
                onClick={(e) => {
                  e.stopPropagation()
                  triggerHaptic(HapticPattern.Medium)
                  handleSizeChange(size)
                }}
              >
                {size.description}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export default ModelCard
