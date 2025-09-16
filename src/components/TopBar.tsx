import React from "react"
import {
  LucideIcon,
  MessageSquareWarning,
  Settings,
  Brain,
  UserCheck,
} from "lucide-react"
import { useModal } from "@/hooks/useModal"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

// Main TopBar Component
const TopBar: React.FC = () => {
  const modal = useModal()

  return (
    <header
      role="banner"
      className={cn(
        "top-bar w-full backdrop-blur-md border-b border-border/50",
        "px-4 py-4 flex items-center justify-between relative z-10",
        "bg-[var(--header-background)]"
      )}
    >
      {/* Left side - Feedback and Memories buttons */}
      <TopBarButtonGroup>
        <TopBarIconButton
          icon={MessageSquareWarning}
          tooltip="Feedback"
          onClick={modal.createOpenHandler("feedback")}
          ariaLabel="Send feedback"
        />
        <TopBarIconButton
          icon={Brain}
          tooltip="Memories"
          onClick={modal.createOpenHandler("memories")}
          ariaLabel="Open memories dashboard"
        />
      </TopBarButtonGroup>

      {/* Center - Hey Ditto Combined Logo */}
      <TopBarLogo />

      {/* Right - Personality and Settings buttons */}
      <TopBarButtonGroup>
        <TopBarIconButton
          icon={UserCheck}
          tooltip="My Personality"
          onClick={modal.createOpenHandler("personalityAssessments")}
          ariaLabel="View personality assessments"
          iconClassName="h-5 w-5 text-purple-600 group-hover:text-purple-500 transition-colors"
        />
        <TopBarIconButton
          icon={Settings}
          tooltip="Settings"
          onClick={modal.createOpenHandler("settings")}
          ariaLabel="Open settings"
        />
      </TopBarButtonGroup>
    </header>
  )
}

// TopBar Icon Button Component
interface TopBarIconButtonProps {
  icon: LucideIcon
  tooltip: string
  onClick: () => void
  ariaLabel: string
  iconClassName?: string
}

const TopBarIconButton: React.FC<TopBarIconButtonProps> = ({
  icon: Icon,
  tooltip,
  onClick,
  ariaLabel,
  iconClassName = "h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors",
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label={ariaLabel}
          className={cn(
            "h-10 w-10 rounded-full hover:bg-accent hover:scale-105",
            "transition-all duration-200 group"
          )}
        >
          <Icon className={iconClassName} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip}</TooltipContent>
    </Tooltip>
  )
}

// TopBar Logo Component
const TopBarLogo: React.FC = () => {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
      <picture>
        {/* Desktop: Large logo for wide screens */}
        <source
          media="(min-width: 1024px)"
          srcSet="/assets/logos/heyditto-icon-words-96.png"
        />
        {/* Tablet: Medium logo for medium screens */}
        <source
          media="(min-width: 640px)"
          srcSet="/assets/logos/heyditto-icon-words-64.png"
        />
        {/* Mobile: Compact logo for narrow screens */}
        <img
          src="/assets/logos/heyditto-icon-words-48.png"
          alt="Hey Ditto"
          className="h-8 sm:h-10 lg:h-12 w-auto"
          loading="eager"
        />
      </picture>
    </div>
  )
}

// TopBar Button Group Component
interface TopBarButtonGroupProps {
  children: React.ReactNode
}

const TopBarButtonGroup: React.FC<TopBarButtonGroupProps> = ({ children }) => {
  return <div className="flex items-center gap-2">{children}</div>
}

export default TopBar
