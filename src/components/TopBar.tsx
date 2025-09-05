import React from "react"
import { MessageSquareWarning, Settings, Brain, UserCheck } from "lucide-react"
import { useModal } from "@/hooks/useModal"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import HeyDittoLogo from "@/components/ui/HeyDittoLogo"

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TopBarProps {
  // Removed onLiveModeClick prop
  // Empty interface is intentional for future extensibility
}

const TopBar: React.FC<TopBarProps> = () => {
  const modal = useModal()
  const openFeedbackModal = modal.createOpenHandler("feedback")
  const openSettingsModal = modal.createOpenHandler("settings")
  const openMemoriesModal = modal.createOpenHandler("memories")

  const topBarClasses = cn(
    "top-bar w-full backdrop-blur-md border-b border-border/50",
    "px-4 py-3 flex items-center justify-between relative z-10",
    "bg-[var(--header-background)]"
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
              <MessageSquareWarning className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Feedback</TooltipContent>
        </Tooltip>

        {/* Live Mode Button removed */}

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

      {/* Center - Hey Ditto Words Logo */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <HeyDittoLogo className="h-8" />
      </div>

      {/* Right - Personality and Settings buttons */}
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={modal.createOpenHandler("personalityAssessments")}
              aria-label="View personality assessments"
              className={iconButtonClasses}
            >
              <UserCheck className="h-5 w-5 text-purple-600 group-hover:text-purple-500 transition-colors" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">My Personality</TooltipContent>
        </Tooltip>

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
      </div>
    </header>
  )
}

export default TopBar
