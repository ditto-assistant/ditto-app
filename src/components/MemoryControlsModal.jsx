import { MdClose } from "react-icons/md";

function MemoryControlsModal({
  memoryStatus,
  toggleMemoryActivation,
  onClose,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Memory Controls</h3>
          <MdClose className="close-icon" onClick={onClose} />
        </div>
        <div className="modal-body">
          <div className="memory-control">
            <div className="memory-control-header">
              <span>Long Term Memory</span>
              <span className={memoryStatus.longTerm ? "inactive" : "active"}>
                {memoryStatus.longTerm ? "Inactive" : "Active"}
              </span>
            </div>
            <button
              className="control-button"
              onClick={() => toggleMemoryActivation("longTerm")}
            >
              {memoryStatus.longTerm ? "Activate" : "Deactivate"}
            </button>
          </div>
          <div className="memory-control">
            <div className="memory-control-header">
              <span>Short Term Memory</span>
              <span className={memoryStatus.shortTerm ? "inactive" : "active"}>
                {memoryStatus.shortTerm ? "Inactive" : "Active"}
              </span>
            </div>
            <button
              className="control-button"
              onClick={() => toggleMemoryActivation("shortTerm")}
            >
              {memoryStatus.shortTerm ? "Activate" : "Deactivate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MemoryControlsModal;
