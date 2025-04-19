import { useState } from "react";
import { usePlatform } from "@/hooks/usePlatform";
import { ScrollArea } from "../ui/scroll-area";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
// Types

import {
  FaBolt,
  FaClock,
  FaCrown,
  FaGoogle,
  FaRobot,
  FaBrain,
  FaFire,
  FaMicrochip,
} from "react-icons/fa";
import { SiOpenai } from "react-icons/si";
import { TbBrandMeta } from "react-icons/tb";
import { 
  MdExpandMore, 
  MdExpandLess,
  MdFilterAlt
} from "react-icons/md";

// Unused, but kept for reference if needed in the future
/*
const VENDOR_COLORS: Record<Vendor, string> = {
  google: "#4285F4",
  openai: "#00A67E",
  anthropic: "#5436DA",
  mistral: "#7A88FF",
  meta: "#0668E1",
  cerebras: "#FF4B4B",
};
*/

interface FilterGroupProps {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const FilterGroup = ({ title, expanded, onToggle, children }: FilterGroupProps) => {
  return (
    <div className="mb-4">
      <div 
        className="flex justify-between items-center py-2 cursor-pointer text-muted-foreground hover:text-foreground"
        onClick={onToggle}
      >
        <span className="font-medium text-sm">{title}</span>
        {expanded ? <MdExpandLess /> : <MdExpandMore />}
      </div>
      
      {expanded && (
        <div className="pl-1 mt-2 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
};

interface FilterValues {
  speed: string | null;
  pricing: string | null;
  imageSupport: boolean;
  vendor: string | null;
  modelFamily: string | null;
  provider?: string | null;
  dimensions?: string | null;
  quality?: string | null;
}

interface ModelFiltersProps {
  activeFilters: FilterValues;
  setActiveFilters: (filters: FilterValues) => void;
  filterType: "prompt" | "image";
  groupedModels: Record<string, unknown>;
}

export const ModelFilters = ({
  activeFilters,
  setActiveFilters,
  filterType,
  groupedModels
}: ModelFiltersProps) => {
  const { isMobile } = usePlatform();
  const [expanded, setExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({
    speed: !isMobile,
    pricing: !isMobile, 
    features: !isMobile,
    vendor: !isMobile,
    family: !isMobile,
    provider: !isMobile,
    dimensions: !isMobile,
    quality: !isMobile
  });
  
  const toggleFilter = (filterKey: keyof FilterValues, value: string) => {
    setActiveFilters({
      ...activeFilters,
      [filterKey]: activeFilters[filterKey] === value ? null : value
    });
  };
  
  const toggleGroup = (group: string) => {
    setExpandedGroups({
      ...expandedGroups,
      [group]: !expandedGroups[group]
    });
  };

  return (
    <div className="w-full md:w-72 lg:w-80 border-r border-border shrink-0">
      {isMobile && (
        <Button
          variant="ghost"
          className="w-full flex justify-between items-center p-3"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <MdFilterAlt />
            <span>Filters</span>
          </div>
          {expanded ? <MdExpandLess /> : <MdExpandMore />}
        </Button>
      )}
      
      <div className={`p-4 ${isMobile && !expanded ? "hidden" : "block"} md:block h-full`}>
        <ScrollArea className="h-[calc(100vh-12rem)] md:h-[calc(100%-2rem)]">
          
          {filterType === "prompt" && (
            <>
              <FilterGroup 
                title="Speed" 
                expanded={expandedGroups.speed}
                onToggle={() => toggleGroup('speed')}
              >
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={activeFilters.speed === "slow" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleFilter('speed', 'slow')}
                  >
                    <FaClock className="mr-1" /> Slow
                  </Badge>
                  <Badge 
                    variant={activeFilters.speed === "medium" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleFilter('speed', 'medium')}
                  >
                    <FaRobot className="mr-1" /> Medium
                  </Badge>
                  <Badge 
                    variant={activeFilters.speed === "fast" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleFilter('speed', 'fast')}
                  >
                    <FaBolt className="mr-1" /> Fast
                  </Badge>
                  <Badge 
                    variant={activeFilters.speed === "insane" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleFilter('speed', 'insane')}
                  >
                    <FaFire className="mr-1" style={{ color: "#FF0000" }} /> Insane
                  </Badge>
                </div>
              </FilterGroup>
              
              <FilterGroup 
                title="Pricing" 
                expanded={expandedGroups.pricing}
                onToggle={() => toggleGroup('pricing')}
              >
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={activeFilters.pricing === "free" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleFilter('pricing', 'free')}
                  >
                    <FaCrown className="mr-1" style={{ opacity: 0.5 }} /> Free
                  </Badge>
                  <Badge 
                    variant={activeFilters.pricing === "premium" ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleFilter('pricing', 'premium')}
                  >
                    <FaCrown className="mr-1" /> Premium
                  </Badge>
                </div>
              </FilterGroup>
              
              <FilterGroup 
                title="Features" 
                expanded={expandedGroups.features}
                onToggle={() => toggleGroup('features')}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <Switch
                    id="image-support"
                    checked={activeFilters.imageSupport}
                    onCheckedChange={(checked) => setActiveFilters({
                      ...activeFilters,
                      imageSupport: checked
                    })}
                  />
                  <label
                    htmlFor="image-support"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Image support
                  </label>
                </div>
              </FilterGroup>
              
              <FilterGroup 
                title="Vendor" 
                expanded={expandedGroups.vendor}
                onToggle={() => toggleGroup('vendor')}
              >
                <div className="flex flex-col space-y-2">
                  <Badge 
                    variant={activeFilters.vendor === "openai" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('vendor', 'openai')}
                  >
                    <SiOpenai className="mr-1" /> OpenAI
                  </Badge>
                  <Badge 
                    variant={activeFilters.vendor === "anthropic" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('vendor', 'anthropic')}
                  >
                    <FaBrain className="mr-1" /> Anthropic
                  </Badge>
                  <Badge 
                    variant={activeFilters.vendor === "google" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('vendor', 'google')}
                  >
                    <FaGoogle className="mr-1" /> Google
                  </Badge>
                  <Badge 
                    variant={activeFilters.vendor === "mistral" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('vendor', 'mistral')}
                  >
                    <FaBolt className="mr-1" /> Mistral
                  </Badge>
                  <Badge 
                    variant={activeFilters.vendor === "meta" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('vendor', 'meta')}
                  >
                    <TbBrandMeta className="mr-1" /> Meta
                  </Badge>
                  <Badge 
                    variant={activeFilters.vendor === "cerebras" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('vendor', 'cerebras')}
                  >
                    <FaMicrochip className="mr-1" /> Cerebras
                  </Badge>
                </div>
              </FilterGroup>
              
              <FilterGroup 
                title="Model Family" 
                expanded={expandedGroups.family}
                onToggle={() => toggleGroup('family')}
              >
                <div className="flex flex-col space-y-2">
                  {Object.keys(groupedModels).map((family) => (
                    <Badge 
                      key={family}
                      variant={activeFilters.modelFamily === family ? "default" : "outline"}
                      className="cursor-pointer justify-start w-full"
                      onClick={() => toggleFilter('modelFamily', family)}
                    >
                      {family}
                    </Badge>
                  ))}
                </div>
              </FilterGroup>
            </>
          )}
          
          {filterType === "image" && (
            <>
              <FilterGroup 
                title="Provider" 
                expanded={expandedGroups.provider}
                onToggle={() => toggleGroup('provider')}
              >
                <div className="flex flex-col space-y-2">
                  <Badge 
                    variant={activeFilters.provider === "openai" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('provider', 'openai')}
                  >
                    <SiOpenai className="mr-1" /> OpenAI
                  </Badge>
                </div>
              </FilterGroup>
              
              <FilterGroup 
                title="Dimensions" 
                expanded={expandedGroups.dimensions}
                onToggle={() => toggleGroup('dimensions')}
              >
                <div className="flex flex-col space-y-2">
                  <Badge 
                    variant={activeFilters.dimensions === "square" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('dimensions', 'square')}
                  >
                    □ Square
                  </Badge>
                  <Badge 
                    variant={activeFilters.dimensions === "landscape" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('dimensions', 'landscape')}
                  >
                    ▭ Landscape
                  </Badge>
                  <Badge 
                    variant={activeFilters.dimensions === "portrait" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('dimensions', 'portrait')}
                  >
                    ▯ Portrait
                  </Badge>
                </div>
              </FilterGroup>
              
              <FilterGroup 
                title="Quality" 
                expanded={expandedGroups.quality}
                onToggle={() => toggleGroup('quality')}
              >
                <div className="flex flex-col space-y-2">
                  <Badge 
                    variant={activeFilters.quality === "standard" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('quality', 'standard')}
                  >
                    Standard
                  </Badge>
                  <Badge 
                    variant={activeFilters.quality === "hd" ? "default" : "outline"}
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter('quality', 'hd')}
                  >
                    HD
                  </Badge>
                </div>
              </FilterGroup>
              
              <FilterGroup 
                title="Model Family" 
                expanded={expandedGroups.family}
                onToggle={() => toggleGroup('family')}
              >
                <div className="flex flex-col space-y-2">
                  {Object.keys(groupedModels).map((family) => (
                    <Badge 
                      key={family}
                      variant={activeFilters.modelFamily === family ? "default" : "outline"}
                      className="cursor-pointer justify-start w-full"
                      onClick={() => toggleFilter('modelFamily', family)}
                    >
                      {family}
                    </Badge>
                  ))}
                </div>
              </FilterGroup>
            </>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};

export default ModelFilters;