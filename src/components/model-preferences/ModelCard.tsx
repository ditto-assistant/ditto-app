// Main imports
import { LLMModel, ImageModel } from "@/api/services";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { Model, Vendor } from "@/types/llm";
import { IMAGE_GENERATION_SIZES } from "@/constants";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  FaBolt,
  FaClock,
  FaCrown,
  FaImage,
  FaRobot,
  FaBrain,
  FaFire,
  FaMicrochip,
  FaStar,
  FaGoogle,
} from "react-icons/fa";
import { SiOpenai } from "react-icons/si";
import { TbBrandMeta } from "react-icons/tb";
import { MdInfoOutline } from "react-icons/md";

// Vendor color mappings for visual consistency
const VENDOR_COLORS: Record<Vendor, string> = {
  google: "#4285F4",
  openai: "#00A67E",
  anthropic: "#5436DA",
  mistral: "#7A88FF",
  meta: "#0668E1",
  cerebras: "#FF4B4B",
};

// Get speed label dynamically from level
const getSpeedLabel = (level: number): string => {
  switch (level) {
    case 1:
      return "Slow";
    case 2:
      return "Moderate";
    case 3:
      return "Fast";
    case 4:
      return "Very Fast";
    case 5:
      return "Ultra Fast";
    case 6:
      return "Blazing";
    case 7:
      return "Insane";
    case 8:
      return "Ludicrous";
    case 9:
      return "Plaid";
    case 10:
      return "Maximum";
    default:
      return `Level ${level}`;
  }
};

const getSpeedIcon = (level: number) => {
  if (level <= 2) return <FaClock />;
  if (level <= 3) return <FaRobot />;
  if (level <= 4) return <FaBolt />;
  return <FaFire style={{ color: "#FF0000" }} />;
};

const getVendorIcon = (vendor: Vendor) => {
  switch (vendor) {
    case "google":
      return <FaGoogle />;
    case "openai":
      return <SiOpenai />;
    case "anthropic":
      return <FaBrain />;
    case "mistral":
      return <FaBolt />;
    case "meta":
      return <TbBrandMeta />;
    case "cerebras":
      return <FaMicrochip />;
    default:
      return null;
  }
};

// Function to check if model is accessible
const isModelAccessible = (
  model: LLMModel | ImageModel,
  userTier: number = 0,
) => {
  // Special case for LLaMA 4 models - always accessible
  if (
    "costPerMillionInputTokens" in model &&
    model.name.toLowerCase().includes("llama-4")
  ) {
    return true;
  }

  // Free models (no cost) are always accessible
  if (
    "costPerMillionInputTokens" in model &&
    (!model.costPerMillionInputTokens || model.costPerMillionInputTokens === 0)
  ) {
    return true;
  }

  // Image models
  if (!("costPerMillionInputTokens" in model)) {
    return model.minimumTier ? userTier >= model.minimumTier : true;
  }

  // Use plan tier to determine accessibility
  if (model.costPerMillionInputTokens > 30 && userTier < 3) return false;
  if (model.costPerMillionInputTokens > 10 && userTier < 2) return false;
  if (model.costPerMillionInputTokens > 0 && userTier < 1) return false;

  return true;
};

interface ModelCardProps {
  model: LLMModel | ImageModel;
  isSelected: boolean;
  userTier: number;
  onSelect: () => void;
  onShowDetails: () => void;
  type: "main" | "programmer" | "image";
  redirectToSubscription?: () => void;
}

export const ModelCard = ({
  model,
  isSelected,
  userTier,
  onSelect,
  onShowDetails,
  type,
  redirectToSubscription,
}: ModelCardProps) => {
  const { preferences, updatePreferences } = useModelPreferences();

  const isAccessible = isModelAccessible(model, userTier);
  const isLLMModel = "costPerMillionInputTokens" in model;

  // Special handling for LLaMA 4 models
  const isLlama4 = isLLMModel && model.name.toLowerCase().includes("llama-4");
  const modelCost = isLLMModel
    ? model.costPerMillionInputTokens || 0
    : (model as ImageModel).cost;
  const tierLabel = isLlama4 ? "Free" : modelCost > 0 ? "Premium" : "Free";

  // Function to get upgrade message
  const getUpgradeMessage = (minimumTier: number) => {
    if (minimumTier >= 3) {
      return { text: "Upgrade to Hero", icon: <FaStar /> };
    } else if (minimumTier >= 2) {
      return { text: "Upgrade to Strong", icon: <FaCrown /> };
    } else {
      return { text: "Upgrade to Spark", icon: <FaBolt /> };
    }
  };

  // Handle size selection for image models
  const handleSizeChange = (size: { wh: string; description: string }) => {
    if (isLLMModel || !preferences) return;

    updatePreferences({
      imageGeneration: {
        model: model.name as Model,
        size,
      },
    });
  };

  return (
    <Card
      className={`overflow-hidden transition-all cursor-pointer ${isSelected ? "border-2 border-primary" : "border"} ${!isAccessible ? "opacity-75" : ""}`}
      onClick={() => {
        if (isAccessible) {
          onSelect();
        }
      }}
    >
      <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">
            {model.displayName}
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {model.modelFlavor}
          </div>
        </div>

        <div className="flex items-center">
          {model.provider && (
            <Badge
              variant="outline"
              className="rounded-full"
              style={{
                backgroundColor:
                  VENDOR_COLORS[model.provider.toLowerCase() as Vendor] ||
                  "#999",
                color: "white",
              }}
            >
              {getVendorIcon(model.provider.toLowerCase() as Vendor)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            {getSpeedIcon(model.speedLevel)}
            <span>{getSpeedLabel(model.speedLevel)}</span>
          </Badge>

          <Badge
            variant={isLlama4 || modelCost === 0 ? "success" : "default"}
            className="flex items-center gap-1"
          >
            {modelCost > 0 && !isLlama4 ? (
              <FaCrown />
            ) : (
              <FaCrown style={{ opacity: 0.5 }} />
            )}
            <span>{tierLabel}</span>
          </Badge>

          {isLLMModel && (model as LLMModel).attachableImageCount > 0 && (
            <Badge variant="success" className="flex items-center gap-1">
              <FaImage />
              <span>
                {(model as LLMModel).attachableImageCount > 1
                  ? `${(model as LLMModel).attachableImageCount} Images`
                  : "Image"}
              </span>
            </Badge>
          )}

          {isLLMModel && (model as LLMModel).supportsTools && (
            <Badge variant="outline" className="flex items-center gap-1">
              <FaRobot />
              <span>Tools</span>
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <Button
          variant="ghost"
          size="sm"
          className="p-0 h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onShowDetails();
          }}
        >
          <MdInfoOutline className="h-4 w-4" />
        </Button>

        {!isAccessible && (
          <Badge
            variant="outline"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              redirectToSubscription?.();
            }}
          >
            {getUpgradeMessage(model.minimumTier).icon}
            <span className="ml-1">
              {getUpgradeMessage(model.minimumTier).text}
            </span>
          </Badge>
        )}
      </CardFooter>

      {/* Size options for image models */}
      {type === "image" && isSelected && isAccessible && (
        <div className="border-t p-4">
          <h4 className="text-sm font-medium mb-2">Size Options</h4>
          <div className="flex flex-wrap gap-2">
            {Object.values(IMAGE_GENERATION_SIZES).map((size) => (
              <Button
                key={size.wh}
                variant={
                  preferences?.imageGeneration?.size?.wh === size.wh
                    ? "default"
                    : "outline"
                }
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSizeChange(size);
                }}
              >
                {size.description}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default ModelCard;
