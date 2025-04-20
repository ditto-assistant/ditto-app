import { Switch } from "../ui/switch"
import { Badge } from "../ui/badge"
import { ScrollArea } from "../ui/scroll-area"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion"

import {
  FaBolt,
  FaClock,
  FaCrown,
  FaGoogle,
  FaRobot,
  FaBrain,
  FaFire,
  FaMicrochip,
} from "react-icons/fa"
import { SiOpenai } from "react-icons/si"
import { TbBrandMeta } from "react-icons/tb"

interface FilterValues {
  speed: string | null
  pricing: string | null
  imageSupport: boolean
  vendor: string | null
  modelFamily: string | null
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
  groupedModels,
}: ModelFiltersProps) => {
  // Toggle filter values
  const toggleFilter = (filterKey: keyof FilterValues, value: string) => {
    setActiveFilters({
      ...activeFilters,
      [filterKey]: activeFilters[filterKey] === value ? null : value,
    })
  }

  return (
    <ScrollArea className="h-[calc(100vh-12rem)] w-full pr-2">
      {filterType === "prompt" && (
        <Accordion
          type="multiple"
          defaultValue={["speed", "pricing", "features", "vendor", "family"]}
          className="w-full"
        >
          <AccordionItem value="speed">
            <AccordionTrigger>Speed</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    activeFilters.speed === "slow" ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleFilter("speed", "slow")}
                >
                  <FaClock className="mr-1" /> Slow
                </Badge>
                <Badge
                  variant={
                    activeFilters.speed === "medium" ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleFilter("speed", "medium")}
                >
                  <FaRobot className="mr-1" /> Medium
                </Badge>
                <Badge
                  variant={
                    activeFilters.speed === "fast" ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleFilter("speed", "fast")}
                >
                  <FaBolt className="mr-1" /> Fast
                </Badge>
                <Badge
                  variant={
                    activeFilters.speed === "insane" ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleFilter("speed", "insane")}
                >
                  <FaFire className="mr-1" style={{ color: "#FF0000" }} />{" "}
                  Insane
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pricing">
            <AccordionTrigger>Pricing</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    activeFilters.pricing === "free" ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleFilter("pricing", "free")}
                >
                  <FaCrown className="mr-1" style={{ opacity: 0.5 }} /> Free
                </Badge>
                <Badge
                  variant={
                    activeFilters.pricing === "premium" ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleFilter("pricing", "premium")}
                >
                  <FaCrown className="mr-1" /> Premium
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="features">
            <AccordionTrigger>Features</AccordionTrigger>
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

          <AccordionItem value="vendor">
            <AccordionTrigger>Vendor</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col space-y-2">
                <Badge
                  variant={
                    activeFilters.vendor === "openai" ? "default" : "outline"
                  }
                  className="cursor-pointer justify-start w-full"
                  onClick={() => toggleFilter("vendor", "openai")}
                >
                  <SiOpenai className="mr-1" /> OpenAI
                </Badge>
                <Badge
                  variant={
                    activeFilters.vendor === "anthropic" ? "default" : "outline"
                  }
                  className="cursor-pointer justify-start w-full"
                  onClick={() => toggleFilter("vendor", "anthropic")}
                >
                  <FaBrain className="mr-1" /> Anthropic
                </Badge>
                <Badge
                  variant={
                    activeFilters.vendor === "google" ? "default" : "outline"
                  }
                  className="cursor-pointer justify-start w-full"
                  onClick={() => toggleFilter("vendor", "google")}
                >
                  <FaGoogle className="mr-1" /> Google
                </Badge>
                <Badge
                  variant={
                    activeFilters.vendor === "mistral" ? "default" : "outline"
                  }
                  className="cursor-pointer justify-start w-full"
                  onClick={() => toggleFilter("vendor", "mistral")}
                >
                  <FaBolt className="mr-1" /> Mistral
                </Badge>
                <Badge
                  variant={
                    activeFilters.vendor === "meta" ? "default" : "outline"
                  }
                  className="cursor-pointer justify-start w-full"
                  onClick={() => toggleFilter("vendor", "meta")}
                >
                  <TbBrandMeta className="mr-1" /> Meta
                </Badge>
                <Badge
                  variant={
                    activeFilters.vendor === "cerebras" ? "default" : "outline"
                  }
                  className="cursor-pointer justify-start w-full"
                  onClick={() => toggleFilter("vendor", "cerebras")}
                >
                  <FaMicrochip className="mr-1" /> Cerebras
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="family">
            <AccordionTrigger>Model Family</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col space-y-2">
                {Object.keys(groupedModels).map((family) => (
                  <Badge
                    key={family}
                    variant={
                      activeFilters.modelFamily === family
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter("modelFamily", family)}
                  >
                    {family}
                  </Badge>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {filterType === "image" && (
        <Accordion
          type="multiple"
          defaultValue={["provider", "dimensions", "quality", "family"]}
          className="w-full"
        >
          <AccordionItem value="provider">
            <AccordionTrigger>Provider</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col space-y-2">
                <Badge
                  variant={
                    activeFilters.provider === "openai" ? "default" : "outline"
                  }
                  className="cursor-pointer justify-start w-full"
                  onClick={() => toggleFilter("provider", "openai")}
                >
                  <SiOpenai className="mr-1" /> OpenAI
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dimensions">
            <AccordionTrigger>Dimensions</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col space-y-2">
                <Badge
                  variant={
                    activeFilters.dimensions === "square"
                      ? "default"
                      : "outline"
                  }
                  className="cursor-pointer justify-start w-full"
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
                  className="cursor-pointer justify-start w-full"
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
                  className="cursor-pointer justify-start w-full"
                  onClick={() => toggleFilter("dimensions", "portrait")}
                >
                  ▯ Portrait
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="quality">
            <AccordionTrigger>Quality</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col space-y-2">
                <Badge
                  variant={
                    activeFilters.quality === "standard" ? "default" : "outline"
                  }
                  className="cursor-pointer justify-start w-full"
                  onClick={() => toggleFilter("quality", "standard")}
                >
                  Standard
                </Badge>
                <Badge
                  variant={
                    activeFilters.quality === "hd" ? "default" : "outline"
                  }
                  className="cursor-pointer justify-start w-full"
                  onClick={() => toggleFilter("quality", "hd")}
                >
                  HD
                </Badge>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="family">
            <AccordionTrigger>Model Family</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-col space-y-2">
                {Object.keys(groupedModels).map((family) => (
                  <Badge
                    key={family}
                    variant={
                      activeFilters.modelFamily === family
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer justify-start w-full"
                    onClick={() => toggleFilter("modelFamily", family)}
                  >
                    {family}
                  </Badge>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </ScrollArea>
  )
}

export default ModelFilters
