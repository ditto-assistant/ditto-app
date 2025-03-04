import Modal from "@/components/ui/modals/Modal";
import { version as appVersion } from "../../../package.json";
import "./WhatsNew.css";
import { ModalId } from "@/hooks/useModal";

// Import all version components
import V0_11_54 from "./versions/V0_11_54";
import V0_11_55 from "./versions/V0_11_55";
// Add imports for future versions here

// Map versions to their components
const versionComponents: Record<string, React.ComponentType> = {
  "0.11.54": V0_11_54,
  "0.11.55": V0_11_55,
  // Add future versions here
};

// Helper to convert version string to component name
export const getVersionComponentKey = (version: string): string => {
  return version.replace(/\./g, "_");
};

// Helper to convert component name to version string
export const getVersionFromComponentKey = (key: string): string => {
  return key.replace(/_/g, ".");
};

interface WhatsNewProps {
  version?: string;
}

const WhatsNew = ({ version = appVersion }: WhatsNewProps) => {
  // Find the component for the current version
  const VersionComponent = versionComponents[version];

  // If no component exists for this version, show a generic message
  const content = VersionComponent ? (
    <VersionComponent />
  ) : (
    <div className="whats-new-generic">
      <p>Welcome to Ditto version {version}!</p>
      <p>Check back later for detailed release notes.</p>
    </div>
  );

  return (
    <Modal id="whatsNew" title={`What's New in v${version}`}>
      <div className="whats-new-content">{content}</div>
    </Modal>
  );
};

export default WhatsNew;
