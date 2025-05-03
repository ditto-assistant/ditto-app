import {
  SiGithub,
  SiInstagram,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SocialLinkProps {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  variant?: "github" | "instagram" | "twitter" | "youtube"
}

const SocialLink = ({ href, icon, children, variant }: SocialLinkProps) => {
  const variantStyles = {
    github: "hover:bg-neutral-800 hover:border-neutral-700 hover:shadow-[0_0_15px_rgba(110,118,129,0.4)]",
    instagram: "hover:bg-gradient-to-r hover:from-purple-600/20 hover:to-pink-600/20 hover:border-pink-500/30 hover:shadow-[0_0_15px_rgba(193,53,132,0.4)]",
    twitter: "hover:bg-blue-900/20 hover:border-blue-500/30 hover:shadow-[0_0_15px_rgba(29,161,242,0.4)]",
    youtube: "hover:bg-red-900/20 hover:border-red-500/30 hover:shadow-[0_0_15px_rgba(255,0,0,0.4)]"
  }
  
  const iconColors = {
    github: "text-neutral-400 group-hover:text-neutral-200",
    instagram: "text-pink-400/80 group-hover:text-pink-300",
    twitter: "text-blue-400/80 group-hover:text-blue-300",
    youtube: "text-red-400/80 group-hover:text-red-300"
  }
  
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "w-full justify-start gap-2 h-10 border border-border/30 bg-background/40 text-sm font-normal",
        "transition-all duration-200 hover:translate-y-[-2px] hover:text-white group active:scale-95 cursor-pointer",
        variant && variantStyles[variant]
      )}
      asChild
    >
      <a 
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="flex items-center gap-2">
          <span className={cn(
            "transition-transform duration-200 group-hover:scale-110", 
            variant === "instagram" && "group-hover:rotate-12",
            variant && iconColors[variant]
          )}>
            {icon}
          </span>
          {children}
        </span>
      </a>
    </Button>
  )
}

export default function SocialLinks() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <SocialLink 
        href="https://github.com/orgs/ditto-assistant/discussions/new/choose"
        icon={<SiGithub size={18} />}
        variant="github"
      >
        New Discussion
      </SocialLink>
      
      <SocialLink 
        href="https://github.com/ditto-assistant/ditto-app/issues/new"
        icon={<SiGithub size={18} />}
        variant="github"
      >
        New Issue
      </SocialLink>
      
      <SocialLink 
        href="https://www.instagram.com/heyditto.ai"
        icon={<SiInstagram size={18} />}
        variant="instagram"
      >
        Instagram
      </SocialLink>
      
      <SocialLink 
        href="https://x.com/heydittoai"
        icon={<SiX size={18} />}
        variant="twitter"
      >
        Twitter
      </SocialLink>
      
      <SocialLink 
        href="https://www.youtube.com/@heyditto"
        icon={<SiYoutube size={18} />}
        variant="youtube"
      >
        YouTube
      </SocialLink>
    </div>
  )
}
