import React from "react"
import { Brain, Settings } from "lucide-react"
import "./TopBar.css"
import { useModal } from "@/hooks/useModal"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DITTO_LOGO } from "@/constants"

interface TopBarProps {}

const TopBar: React.FC<TopBarProps> = () => {
  const modal = useModal()
  const openMemoriesOverlay = modal.createOpenHandler("memories")
  const openSettingsModal = modal.createOpenHandler("settings")

  return (
    <div className="top-bar w-full bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between relative z-10">
      {/* Left - Memories Brain Icon */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={openMemoriesOverlay}
            aria-label="Open memories"
            className="h-10 w-10 rounded-full hover:bg-accent hover:scale-105 transition-all duration-200 group"
          >
            <Brain className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Memories</TooltipContent>
      </Tooltip>

      {/* Center - Logo and Hey Ditto Text */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage
            src={DITTO_LOGO}
            alt="Ditto"
            className="h-8 w-8 rounded-full"
          />
        </Avatar>
        <h1 className="text-lg font-medium text-foreground/90 tracking-wide">
          Hey Ditto
        </h1>
      </div>

      {/* Right - Settings Cog Icon */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={openSettingsModal}
            aria-label="Open settings"
            className="h-10 w-10 rounded-full hover:bg-accent hover:scale-105 transition-all duration-200 group"
          >
            <Settings className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Settings</TooltipContent>
      </Tooltip>
    </div>
  )
}

export default TopBar
