import React from "react"
import { MessageCircle, Settings, Brain } from "lucide-react"
import { useModal } from "@/hooks/useModal"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DITTO_LOGO } from "@/constants"
import { cn } from "@/lib/utils"

const BRAND_TEXT = "Hey Ditto"

const TopBar: React.FC = () => {
  const modal = useModal()
  const openFeedbackModal = modal.createOpenHandler("feedback")
  const openSettingsModal = modal.createOpenHandler("settings")
  const openMemoriesModal = modal.createOpenHandler("memories")

  const topBarClasses = cn(
    "top-bar w-full bg-background/80 backdrop-blur-md border-b border-border/50",
    "px-4 py-3 flex items-center justify-between relative z-10"
  )

  const iconButtonClasses = cn(
    "h-10 w-10 rounded-full hover:bg-accent hover:scale-105",
    "transition-all duration-200 group"
  )

  return (
    <header role="banner" className={topBarClasses}>
      {/* Left side - Feedback and Memories buttons */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={openFeedbackModal}
              aria-label="Send feedback"
              className={iconButtonClasses}
            >
              <MessageCircle className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Feedback</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={openMemoriesModal}
              aria-label="Open memories dashboard"
              className={iconButtonClasses}
            >
              <Brain className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Memories</TooltipContent>
        </Tooltip>
      </div>

      {/* Center - Logo and Brand Text */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
        <Avatar className="h-8 w-8 ring-1 ring-blue-500/70 shadow-sm shadow-blue-500/50">
          <AvatarImage
            src={DITTO_LOGO}
            alt="Ditto"
            className="h-8 w-8 rounded-full rainbow-gradient"
          />
        </Avatar>
        <span className="text-lg font-medium text-foreground select-none">
          {BRAND_TEXT}
        </span>
      </div>

      {/* Right - Settings button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={openSettingsModal}
            aria-label="Open settings"
            className={iconButtonClasses}
          >
            <Settings className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Settings</TooltipContent>
      </Tooltip>
    </header>
  )
}

export default TopBar
