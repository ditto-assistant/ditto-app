import Modal from "@/components/ui/modals/Modal";
import { version as appVersion } from "../../../package.json";
import "./WhatsNew.css";
// Import all version components
import V0_11_54 from "./versions/V0_11_54";
import V0_11_55 from "./versions/V0_11_55";
import V0_11_56 from "./versions/V0_11_56";
import V0_11_57 from "./versions/V0_11_57";
import V0_11_58 from "./versions/V0_11_58";
import V0_11_60 from "./versions/V0_11_60";
import V0_11_61 from "./versions/V0_11_61";
import V0_11_62 from "./versions/V0_11_62";
import V0_11_63 from "./versions/V0_11_63";
import V0_11_64 from "./versions/V0_11_64";
import V0_11_65 from "./versions/V0_11_65";
import V0_11_66 from "./versions/V0_11_66";
import V0_12_0 from "./versions/V0_12_0";
import V0_12_1 from "./versions/V0_12_1";
// Add imports for future versions here

// Map versions to their components
const versionComponents: Record<string, React.ComponentType> = {
  "0.11.54": V0_11_54,
  "0.11.55": V0_11_55,
  "0.11.56": V0_11_56,
  "0.11.57": V0_11_57,
  "0.11.58": V0_11_58,
  "0.11.60": V0_11_60,
  "0.11.61": V0_11_61,
  "0.11.62": V0_11_62,
  "0.11.63": V0_11_63,
  "0.11.64": V0_11_64,
  "0.11.65": V0_11_65,
  "0.11.66": V0_11_66,
  "0.12.0": V0_12_0,
  "0.12.1": V0_12_1,
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
