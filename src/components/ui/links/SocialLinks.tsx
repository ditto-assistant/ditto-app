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
    github:
      "hover:border-ditto-glass-border-strong",
    instagram:
      "hover:border-ditto-glass-border-strong",
    twitter:
      "hover:border-ditto-glass-border-strong",
    youtube:
      "hover:border-ditto-glass-border-strong",
  }

  const iconColors = {
    github: "text-ditto-secondary group-hover:text-ditto-primary",
    instagram: "text-ditto-secondary group-hover:text-ditto-gradient",
    twitter: "text-ditto-secondary group-hover:text-ditto-primary",
    youtube: "text-ditto-secondary group-hover:text-ditto-gradient",
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "w-full justify-start gap-2 h-10 glass-interactive text-sm font-normal text-ditto-secondary",
        "transition-all duration-200 hover:translate-y-[-2px] hover:text-ditto-primary group active:scale-95 cursor-pointer",
        variant && variantStyles[variant]
      )}
      asChild
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "transition-transform duration-200 group-hover:scale-110",
              variant === "instagram" && "group-hover:rotate-12",
              variant && iconColors[variant]
            )}
          >
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
