import { LLMModel, ImageModel } from "@/api/services";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Vendor } from "@/types/llm";

interface ModelDetailsProps {
  model: LLMModel | ImageModel | null;
  isOpen: boolean;
  onClose: () => void;
}

// Format description with proper capitalization
const formatDescription = (text: string): string => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// SPEED_COLORS for matching the original implementation
const SPEED_COLORS = {
  1: "#ED4245",
  2: "#FAA61A",
  3: "#43B581",
  4: "#FFD700",
  5: "linear-gradient(45deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #8F00FF)",
  6: "#FFD700",
  7: "#FFD700",
  8: "#FFD700",
  9: "#FFD700",
  10: "#FFD700",
};

// Vendor color mappings for visual consistency
const VENDOR_COLORS: Record<Vendor, string> = {
  google: "#4285F4",
  openai: "#00A67E",
  anthropic: "#5436DA",
  mistral: "#7A88FF",
  meta: "#0668E1",
  cerebras: "#FF4B4B",
};

// Function to get model stats
const getModelStats = (model: LLMModel | ImageModel) => {
  return [
    {
      name: "Speed",
      value: model.speedLevel,
      color: SPEED_COLORS[model.speedLevel as keyof typeof SPEED_COLORS] || "#4285F4",
    },
    {
      name: "Intelligence",
      value: model.intelligenceLevel,
      color: "#4285F4",
    },
    { name: "Creativity", value: model.creativityLevel, color: "#F472B6" },
    { name: "Stamina", value: model.staminaLevel, color: "#8B5CF6" },
  ];
};

export const ModelDetails = ({ model, isOpen, onClose }: ModelDetailsProps) => {
  if (!model) return null;
  
  const modelStats = getModelStats(model);
  const isLLMModel = 'costPerMillionInputTokens' in model;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="text-xl">{model.displayName}</span>
            <Badge 
              className="ml-2"
              style={{ 
                backgroundColor: VENDOR_COLORS[model.provider.toLowerCase() as Vendor] || "#999",
                color: "white" 
              }}
            >
              {model.provider}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {formatDescription(model.description)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <h3 className="text-sm font-medium mb-4">Stats</h3>
          <div className="space-y-4">
            {modelStats.map((stat) => (
              <div key={stat.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{stat.name}</span>
                  <span>{stat.value}/10</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{
                      width: `${stat.value * 10}%`,
                      background: stat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium">Class</h4>
                <p className="text-sm">{model.characterClass}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Personality</h4>
                <p className="text-sm">{model.personality}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Special Ability</h4>
                <p className="text-sm">{model.specialAbility}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Version</h4>
                <p className="text-sm">{model.version}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Strengths</h4>
                <p className="text-sm">{model.strengths}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium">Weaknesses</h4>
                <p className="text-sm">{model.weaknesses}</p>
              </div>
            </div>
            
            {/* LLM-specific info */}
            {isLLMModel && 'costPerMillionInputTokens' in model && model.costPerMillionInputTokens > 0 && (
              <div className="mt-4 p-4 bg-secondary/20 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Pricing Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Input Cost:</div>
                  <div>${model.costPerMillionInputTokens.toFixed(3)}/M tokens</div>
                  <div>Output Cost:</div>
                  <div>${model.costPerMillionOutputTokens.toFixed(3)}/M tokens</div>
                </div>
              </div>
            )}
            
            {/* Image model info */}
            {!isLLMModel && (
              <div className="mt-4 p-4 bg-secondary/20 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Image Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Size:</div>
                  <div>{(model as ImageModel).imageSize}</div>
                  <div>Orientation:</div>
                  <div>{(model as ImageModel).imageOrientation}</div>
                  <div>Cost per Image:</div>
                  <div>${(model as ImageModel).cost.toFixed(3)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelDetails;