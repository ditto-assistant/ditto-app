import {
  SiGithub,
  SiInstagram,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons"
import { A } from "./Anchor"

export default function SocialLinks() {
  return (
    <div className="feedback-actions">
      <A href="https://github.com/orgs/ditto-assistant/discussions/new/choose">
        <SiGithub size={24} /> New Discussion
      </A>
      <A href="https://github.com/ditto-assistant/ditto-app/issues/new">
        <SiGithub size={24} /> New Issue
      </A>
      <A href="https://www.instagram.com/heyditto.ai">
        <SiInstagram size={24} /> Instagram
      </A>
      <A href="https://x.com/heydittoai">
        <SiX size={24} /> Twitter
      </A>
      <A href="https://www.youtube.com/@heyditto">
        <SiYoutube size={24} /> YouTube
      </A>
    </div>
  )
}
