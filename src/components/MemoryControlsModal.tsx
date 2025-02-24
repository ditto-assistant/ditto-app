import { MdClose } from "react-icons/md";
import { MemorySlider } from "@/components/ui/sliders/MemorySlider";
import { MEMORY_CONFIG } from "@/constants";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import "./MemoryControlsModal.css";
import { useCallback } from "react";

interface MemoryControlsModalProps {
  onClose: () => void;
}

function MemoryControlsModal({ onClose }: MemoryControlsModalProps) {
  const { preferences, updatePreferences } = useModelPreferences();

  const handleShortTermChange = useCallback(
    (newValues: number[]) => {
      updatePreferences({
        memory: {
          ...preferences.memory,
          shortTermMemoryCount: newValues[0],
        },
      });
    },
    [preferences, updatePreferences]
  );

  const handleLongTermChange = useCallback(
    (newValues: number[]) => {
      if (newValues.length <= MEMORY_CONFIG.longTerm.maxChainLength) {
        updatePreferences({
          memory: {
            ...preferences.memory,
            longTermMemoryChain: newValues,
          },
        });
      }
    },
    [preferences, updatePreferences]
  );

  if (!preferences) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Memory Controls</h3>
          <MdClose className="close-icon" onClick={onClose} />
        </div>
        <div className="modal-body">
          <MemorySlider
            label="Short Term Memory"
            values={[preferences.memory.shortTermMemoryCount]}
            onChange={handleShortTermChange}
            min={MEMORY_CONFIG.shortTerm.min}
            max={MEMORY_CONFIG.shortTerm.max}
            step={MEMORY_CONFIG.shortTerm.step}
            marks={MEMORY_CONFIG.shortTerm.marks}
            description="Number of recent messages to include in short-term memory"
          />

          <MemorySlider
            label="Long Term Memory Chain"
            values={preferences.memory.longTermMemoryChain}
            onChange={handleLongTermChange}
            min={MEMORY_CONFIG.longTerm.min}
            max={MEMORY_CONFIG.longTerm.max}
            step={MEMORY_CONFIG.longTerm.step}
            marks={MEMORY_CONFIG.longTerm.marks}
            description={`Chain of memory depths for long-term memory search (max ${MEMORY_CONFIG.longTerm.maxChainLength} levels)`}
            showChainControls
            maxChainLength={MEMORY_CONFIG.longTerm.maxChainLength}
          />
        </div>
      </div>
    </div>
  );
}

export default MemoryControlsModal;
