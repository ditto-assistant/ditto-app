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
    setActiveFilters({
      ...activeFilters,
      [filterKey]: activeFilters[filterKey] === value ? null : value,
    })
  }

  // Common badge styles
  const badgeClasses = "cursor-pointer h-10 py-2 text-sm"

  return (
    <div className="px-4 space-y-2">
      {filterType === "prompt" && (
        <Accordion type="multiple" defaultValue={[]}>
          {/* Speed Filter */}
          <AccordionItem value="speed" className="border-b-0">
            <AccordionTrigger className="py-2">Speed</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    activeFilters.speed === "slow" ? "default" : "outline"
                  }
                  className={`${badgeClasses}`}
                  onClick={() => toggleFilter("speed", "slow")}
                >
                  <Clock className="mr-2 h-4 w-4" /> Slow
                </Badge>
                <Badge
                  variant={
                    activeFilters.speed === "medium" ? "default" : "outline"
                  }
                  className={`${badgeClasses}`}
                  onClick={() => toggleFilter("speed", "medium")}
                >
                  <Bot className="mr-2 h-4 w-4" /> Medium
                </Badge>
                <Badge
                  variant={
                    activeFilters.speed === "fast" ? "default" : "outline"
                  }
                  className={`${badgeClasses}`}
                  onClick={() => toggleFilter("speed", "fast")}
                >
                  <Bolt className="mr-2 h-4 w-4" /> Fast
                </Badge>
                <Badge
                  variant={
                    activeFilters.speed === "insane" ? "default" : "outline"
                  }
                  className={`${badgeClasses}`}
                  onClick={() => toggleFilter("speed", "insane")}
                >
                  <Flame
                    className="mr-2 h-4 w-4"
                    style={{ color: "#FF0000" }}
                  />{" "}
                  Insane
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Pricing Filter */}
          <AccordionItem value="pricing" className="border-b-0">
            <AccordionTrigger className="py-2">Pricing</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    activeFilters.pricing === "free" ? "default" : "outline"
                  }
                  className={`${badgeClasses}`}
                  onClick={() => toggleFilter("pricing", "free")}
                >
                  <Crown className="mr-2 h-4 w-4" style={{ opacity: 0.5 }} />{" "}
                  Free
                </Badge>
                <Badge
                  variant={
                    activeFilters.pricing === "premium" ? "default" : "outline"
                  }
                  className={`${badgeClasses}`}
                  onClick={() => toggleFilter("pricing", "premium")}
                >
                  <Crown className="mr-2 h-4 w-4" /> Premium
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Features Filter */}
          <AccordionItem value="features" className="border-b-0">
            <AccordionTrigger className="py-2">Features</AccordionTrigger>
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
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Image support
                </label>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Vendor Filter */}
          <AccordionItem value="vendor" className="border-b-0">
            <AccordionTrigger className="py-2">Vendor</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2">
                <Badge
                  variant={
                    activeFilters.vendor === "openai" ? "default" : "outline"
                  }
                  className={`${badgeClasses} justify-center`}
                  onClick={() => toggleFilter("vendor", "openai")}
                >
                  <SiOpenai className="mr-2 h-4 w-4" /> OpenAI
                </Badge>
                <Badge
                  variant={
                    activeFilters.vendor === "anthropic" ? "default" : "outline"
                  }
                  className={`${badgeClasses} justify-center`}
                  onClick={() => toggleFilter("vendor", "anthropic")}
                >
                  <SiAnthropic className="mr-2 h-4 w-4" /> Anthropic
                </Badge>
                <Badge
                  variant={
                    activeFilters.vendor === "google" ? "default" : "outline"
                  }
                  className={`${badgeClasses} justify-center`}
                  onClick={() => toggleFilter("vendor", "google")}
                >
                  <SiGoogle className="mr-2 h-4 w-4" /> Google
                </Badge>
                <Badge
                  variant={
                    activeFilters.vendor === "mistral" ? "default" : "outline"
                  }
                  className={`${badgeClasses} justify-center`}
                  onClick={() => toggleFilter("vendor", "mistral")}
                >
                  <Bolt className="mr-2 h-4 w-4" /> Mistral
                </Badge>
                <Badge
                  variant={
                    activeFilters.vendor === "meta" ? "default" : "outline"
                  }
                  className={`${badgeClasses} justify-center`}
                  onClick={() => toggleFilter("vendor", "meta")}
                >
                  <SiMeta className="mr-2 h-4 w-4" /> Meta
                </Badge>
                <Badge
                  variant={
                    activeFilters.vendor === "cerebras" ? "default" : "outline"
                  }
                  className={`${badgeClasses} justify-center`}
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
            <AccordionTrigger className="py-2">Provider</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    activeFilters.provider === "openai" ? "default" : "outline"
                  }
                  className={`${badgeClasses}`}
                  onClick={() => toggleFilter("provider", "openai")}
                >
                  <SiOpenai className="mr-2 h-4 w-4" /> OpenAI
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Dimensions Filter */}
          <AccordionItem value="dimensions" className="border-b-0">
            <AccordionTrigger className="py-2">Dimensions</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-3 gap-2">
                <Badge
                  variant={
                    activeFilters.dimensions === "square"
                      ? "default"
                      : "outline"
                  }
                  className={`${badgeClasses} justify-center`}
                  onClick={() => toggleFilter("dimensions", "square")}
                >
                  □ Square
                </Badge>
                <Badge
                  variant={
                    activeFilters.dimensions === "landscape"
                      ? "default"
                      : "outline"
                  }
                  className={`${badgeClasses} justify-center`}
                  onClick={() => toggleFilter("dimensions", "landscape")}
                >
                  ▭ Landscape
                </Badge>
                <Badge
                  variant={
                    activeFilters.dimensions === "portrait"
                      ? "default"
                      : "outline"
                  }
                  className={`${badgeClasses} justify-center`}
                  onClick={() => toggleFilter("dimensions", "portrait")}
                >
                  ▯ Portrait
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Quality Filter */}
          <AccordionItem value="quality" className="border-b-0">
            <AccordionTrigger className="py-2">Quality</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-2">
                <Badge
                  variant={
                    activeFilters.quality === "standard" ? "default" : "outline"
                  }
                  className={`${badgeClasses} justify-center`}
                  onClick={() => toggleFilter("quality", "standard")}
                >
                  Standard
                </Badge>
                <Badge
                  variant={
                    activeFilters.quality === "hd" ? "default" : "outline"
                  }
                  className={`${badgeClasses} justify-center`}
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
