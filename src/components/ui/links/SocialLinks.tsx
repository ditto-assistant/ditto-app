import { FaGithub, FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { A } from "./Anchor";

export default function SocialLinks() {
  return (
    <div className="feedback-actions">
      <A href="https://github.com/orgs/ditto-assistant/discussions/new/choose">
        <FaGithub /> New Discussion
      </A>
      <A href="https://github.com/ditto-assistant/ditto-app/issues/new">
        <FaGithub /> New Issue
      </A>
      <A href="https://www.instagram.com/heyditto.ai">
        <FaInstagram /> Instagram
      </A>
      <A href="https://x.com/heydittoai">
        <FaXTwitter /> Twitter
      </A>
      <A href="https://www.youtube.com/@heyditto">
        <FaYoutube /> YouTube
      </A>
    </div>
  );
}
