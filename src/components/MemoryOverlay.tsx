import "./MemoryOverlay.css";
import ModelPreferencesModal from "@/components/ModelPreferencesModal";
import MemoryControlsModal from "@/components/MemoryControlsModal";
import AgentToolsModal from "@/components/AgentToolsModal";
import Modal, { ModalTab } from "@/components/ui/modals/Modal";

export default function MemoryOverlay() {
  const tabs: ModalTab[] = [
    {
      id: "preferences",
      label: "Models",
      content: <ModelPreferencesModal />,
    },
    {
      id: "memory",
      label: "Memory",
      content: <MemoryControlsModal />,
    },
    {
      id: "tools",
      label: "Tools",
      content: <AgentToolsModal />,
    },
  ];

  return (
    <Modal
      id="memorySettings"
      title="Agent Settings"
      tabs={tabs}
      defaultTabId="preferences"
      fullScreen
    />
  );
}
