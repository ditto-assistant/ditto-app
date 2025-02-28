import "./MemoryOverlay.css";
import { useMemo } from "react";
import ModelPreferencesModal from "@/components/ModelPreferencesModal";
import MemoryControlsModal from "@/components/MemoryControlsModal";
import AgentToolsModal from "@/components/AgentToolsModal";
import Modal, { ModalTab } from "@/components/ui/modals/Modal";

export default function MemoryOverlay() {
  const modelPreferences = useMemo(() => <ModelPreferencesModal />, []);
  const memoryControls = useMemo(() => <MemoryControlsModal />, []);
  const agentTools = useMemo(() => <AgentToolsModal />, []);

  const tabs: ModalTab[] = [
    {
      id: "preferences",
      label: "Models",
      content: modelPreferences,
    },
    {
      id: "memory",
      label: "Memory",
      content: memoryControls,
    },
    {
      id: "tools",
      label: "Tools",
      content: agentTools,
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
