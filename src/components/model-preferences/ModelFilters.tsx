import { Switch } from "../ui/switch"
import { Badge } from "../ui/badge"
import {
  SiOpenai,
  SiGoogle,
  SiAnthropic,
  SiMeta,
} from "@icons-pack/react-simple-icons"
import { Bolt, Microchip, Flame, Clock, Bot, Crown } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { triggerHaptic, HapticPattern } from "@/utils/haptics"

interface FilterValues {
  speed: string | null
  pricing: string | null
  imageSupport: boolean
  vendor: string | null
  modelFamily: string | null // keep in interface but not using in UI
  provider?: string | null
  dimensions?: string | null
  quality?: string | null
}

interface ModelFiltersProps {
  activeFilters: FilterValues
  setActiveFilters: (filters: FilterValues) => void
  filterType: "prompt" | "image"
  groupedModels: Record<string, unknown>
}

export const ModelFilters = ({
  activeFilters,
  setActiveFilters,
  filterType,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  groupedModels,
}: ModelFiltersProps) => {
  // Toggle filter values
  const toggleFilter = (filterKey: keyof FilterValues, value: string) => {
    triggerHaptic(HapticPattern.Light)
    setActiveFilters({
      ...activeFilters,
      [filterKey]: activeFilters[filterKey] === value ? null : value,
    })
  }

  // Common badge styles
  const badgeClasses = "cursor-pointer h-10 py-2 text-sm transition-all"
  const getFilterBadgeClasses = (isActive: boolean) => 
    isActive 
      ? "gradient-ring text-ditto-primary" 
      : "glass-interactive text-ditto-secondary hover:text-ditto-primary border-ditto-glass-border"

  return (
    <div className="px-4 space-y-2">
      {filterType === "prompt" && (
        <Accordion type="multiple" defaultValue={[]}>
          {/* Speed Filter */}
          <AccordionItem value="speed" className="border-b-0">
            <AccordionTrigger className="py-2 text-ditto-primary">Speed</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={`${badgeClasses} ${getFilterBadgeClasses(activeFilters.speed === "slow")}`}
                  onClick={() => toggleFilter("speed", "slow")}
                >
                  <Clock className="mr-2 h-4 w-4" /> Slow
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} ${getFilterBadgeClasses(activeFilters.speed === "medium")}`}
                  onClick={() => toggleFilter("speed", "medium")}
                >
                  <Bot className="mr-2 h-4 w-4" /> Medium
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} ${getFilterBadgeClasses(activeFilters.speed === "fast")}`}
                  onClick={() => toggleFilter("speed", "fast")}
                >
                  <Bolt className="mr-2 h-4 w-4" /> Fast
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} ${getFilterBadgeClasses(activeFilters.speed === "insane")}`}
                  onClick={() => toggleFilter("speed", "insane")}
                >
                  <Flame className="mr-2 h-4 w-4 text-red-400" /> Insane
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Pricing Filter */}
          <AccordionItem value="pricing" className="border-b-0">
            <AccordionTrigger className="py-2 text-ditto-primary">Pricing</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={`${badgeClasses} ${getFilterBadgeClasses(activeFilters.pricing === "free")}`}
                  onClick={() => toggleFilter("pricing", "free")}
                >
                  <Crown className="mr-2 h-4 w-4 opacity-50" /> Free
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} ${getFilterBadgeClasses(activeFilters.pricing === "premium")}`}
                  onClick={() => toggleFilter("pricing", "premium")}
                >
                  <Crown className="mr-2 h-4 w-4" /> Premium
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Features Filter */}
          <AccordionItem value="features" className="border-b-0">
            <AccordionTrigger className="py-2 text-ditto-primary">Features</AccordionTrigger>
            <AccordionContent>
              <div className="flex items-center space-x-2 mb-2">
                <Switch
                  id="image-support"
                  checked={activeFilters.imageSupport}
                  onCheckedChange={(checked) =>
                    setActiveFilters({
                      ...activeFilters,
                      imageSupport: checked,
                    })
                  }
                />
                <label
                  htmlFor="image-support"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-ditto-secondary"
                >
                  Image support
                </label>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Vendor Filter */}
          <AccordionItem value="vendor" className="border-b-0">
            <AccordionTrigger className="py-2 text-ditto-primary">Vendor</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2">
                <Badge
                  variant="outline"
                  className={`${badgeClasses} justify-center ${getFilterBadgeClasses(activeFilters.vendor === "openai")}`}
                  onClick={() => toggleFilter("vendor", "openai")}
                >
                  <SiOpenai className="mr-2 h-4 w-4" /> OpenAI
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} justify-center ${getFilterBadgeClasses(activeFilters.vendor === "anthropic")}`}
                  onClick={() => toggleFilter("vendor", "anthropic")}
                >
                  <SiAnthropic className="mr-2 h-4 w-4" /> Anthropic
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} justify-center ${getFilterBadgeClasses(activeFilters.vendor === "google")}`}
                  onClick={() => toggleFilter("vendor", "google")}
                >
                  <SiGoogle className="mr-2 h-4 w-4" /> Google
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} justify-center ${getFilterBadgeClasses(activeFilters.vendor === "mistral")}`}
                  onClick={() => toggleFilter("vendor", "mistral")}
                >
                  <Bolt className="mr-2 h-4 w-4" /> Mistral
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} justify-center ${getFilterBadgeClasses(activeFilters.vendor === "meta")}`}
                  onClick={() => toggleFilter("vendor", "meta")}
                >
                  <SiMeta className="mr-2 h-4 w-4" /> Meta
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} justify-center ${getFilterBadgeClasses(activeFilters.vendor === "cerebras")}`}
                  onClick={() => toggleFilter("vendor", "cerebras")}
                >
                  <Microchip className="mr-2 h-4 w-4" /> Cerebras
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {filterType === "image" && (
        <Accordion type="multiple" defaultValue={[]}>
          {/* Provider Filter */}
          <AccordionItem value="provider" className="border-b-0">
            <AccordionTrigger className="py-2 text-ditto-primary">Provider</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={`${badgeClasses} ${getFilterBadgeClasses(activeFilters.provider === "openai")}`}
                  onClick={() => toggleFilter("provider", "openai")}
                >
                  <SiOpenai className="mr-2 h-4 w-4" /> OpenAI
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Dimensions Filter */}
          <AccordionItem value="dimensions" className="border-b-0">
            <AccordionTrigger className="py-2 text-ditto-primary">Dimensions</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-3 gap-2">
                <Badge
                  variant="outline"
                  className={`${badgeClasses} justify-center ${getFilterBadgeClasses(activeFilters.dimensions === "square")}`}
                  onClick={() => toggleFilter("dimensions", "square")}
                >
                  □ Square
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} justify-center ${getFilterBadgeClasses(activeFilters.dimensions === "landscape")}`}
                  onClick={() => toggleFilter("dimensions", "landscape")}
                >
                  ▭ Landscape
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} justify-center ${getFilterBadgeClasses(activeFilters.dimensions === "portrait")}`}
                  onClick={() => toggleFilter("dimensions", "portrait")}
                >
                  ▯ Portrait
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Quality Filter */}
          <AccordionItem value="quality" className="border-b-0">
            <AccordionTrigger className="py-2 text-ditto-primary">Quality</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2">
                <Badge
                  variant="outline"
                  className={`${badgeClasses} justify-center ${getFilterBadgeClasses(activeFilters.quality === "standard")}`}
                  onClick={() => toggleFilter("quality", "standard")}
                >
                  Standard
                </Badge>
                <Badge
                  variant="outline"
                  className={`${badgeClasses} justify-center ${getFilterBadgeClasses(activeFilters.quality === "hd")}`}
                  onClick={() => toggleFilter("quality", "hd")}
                >
                  HD
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  )
}

export default ModelFilters
