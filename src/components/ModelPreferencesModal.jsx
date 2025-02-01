import { useState, useEffect } from "react";
import ModelDropdown from "./ModelDropdown";
import ModelDropdownImage from "./ModelDropdownImage";
import { MdClose } from "react-icons/md";
import { DEFAULT_MODELS } from "../constants";
import {
  FaBolt,
  FaClock,
  FaCrown,
  FaImage,
  FaGoogle,
  FaRobot,
  FaBrain,
  FaFire,
  FaMicrochip,
} from "react-icons/fa";
import { SiOpenai } from "react-icons/si";
import { TbBrandMeta } from "react-icons/tb";

const VENDOR_COLORS = {
  google: "#4285F4",
  openai: "#00A67E",
  anthropic: "#5436DA",
  mistral: "#7A88FF",
  meta: "#0668E1",
  cerebras: "#FF4B4B",
};

const SPEED_COLORS = {
  slow: "#ED4245",
  medium: "#FAA61A",
  fast: "#43B581",
  insane:
    "linear-gradient(45deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #8F00FF)",
};

function ModelPreferencesModal({
  preferences,
  updatePreferences,
  onClose,
  hasEnoughBalance,
}) {
  const [activeSection, setActiveSection] = useState("main"); // "main", "programmer", or "image"
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showTaggedModels, setShowTaggedModels] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    speed: null,
    pricing: null,
    imageSupport: false,
    vendor: null,
  });
  const [filteredModels, setFilteredModels] = useState(DEFAULT_MODELS);

  // Handle clicking outside of any dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        e.target.closest(".model-dropdown") ||
        e.target.closest(".dropdown-option") ||
        e.target.closest(".model-selector") ||
        e.target.closest(".selected-value")
      ) {
        return;
      }
      setOpenDropdown(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter models based on active filters
  useEffect(() => {
    let filtered = [...DEFAULT_MODELS];

    // Filter tagged/untagged models
    filtered = filtered.filter((model) =>
      showTaggedModels ? model.isTaggedModel : !model.isTaggedModel
    );

    if (activeFilters.speed) {
      filtered = filtered.filter(
        (model) => model.speedLevel === activeFilters.speed
      );
    }

    if (activeFilters.pricing === "free") {
      filtered = filtered.filter((model) => model.isFree === true);
    } else if (activeFilters.pricing === "premium") {
      filtered = filtered.filter((model) => model.isPremium);
    }

    if (activeFilters.imageSupport) {
      filtered = filtered.filter((model) => model.supports?.imageAttachments);
    }

    if (activeFilters.vendor) {
      filtered = filtered.filter(
        (model) => model.vendor === activeFilters.vendor
      );
    }

    setFilteredModels(filtered);
  }, [activeFilters, showTaggedModels]);

  const handleModalClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   *
   * @param {"mainModel" | "programmerModel" | "imageGeneration"} key
   * @param {any} value
   */
  const handleModelChange = (key, value) => {
    updatePreferences({ [key]: value });
    setOpenDropdown(null);
  };

  const toggleFilter = (filterType, value) => {
    setActiveFilters((prev) => ({
      ...prev,
      [filterType]: prev[filterType] === value ? null : value,
    }));
  };

  const getSpeedButtonColor = (speed) => {
    if (activeFilters.speed !== speed) return "#2F3136";
    switch (speed) {
      case "slow":
        return "#ED4245"; // Red
      case "medium":
        return "#FAA61A"; // Orange
      case "fast":
        return "#43B581"; // Green
      case "insane":
        return "#5865F2"; // Blue
      default:
        return "#2F3136";
    }
  };

  const getSpeedIcon = (speed) => {
    switch (speed) {
      case "slow":
        return <FaClock />;
      case "medium":
        return <FaRobot />;
      case "fast":
        return <FaBolt />;
      case "insane":
        return <FaFire style={{ color: "#FF0000" }} />;
      default:
        return null;
    }
  };

  const getVendorIcon = (vendor) => {
    switch (vendor) {
      case "google":
        return <FaGoogle />;
      case "openai":
        return <SiOpenai />;
      case "anthropic":
        return <FaBrain />;
      case "mistral":
        return <FaBolt />;
      case "meta":
        return <TbBrandMeta />;
      case "cerebras":
        return <FaMicrochip />;
      default:
        return null;
    }
  };

  const renderModelCard = (model) => (
    <div
      key={model.id}
      onClick={() =>
        handleModelChange(
          activeSection === "main" ? "mainModel" : "programmerModel",
          model.id
        )
      }
      style={{
        ...styles.modelCard,
        border:
          model.id ===
          preferences[
            activeSection === "main" ? "mainModel" : "programmerModel"
          ]
            ? "2px solid #5865F2"
            : "1px solid #1E1F22",
      }}
    >
      <div style={styles.modelCardHeader}>
        <span style={styles.modelName}>{model.name}</span>
        {model.vendor && (
          <span
            style={{
              ...styles.vendorBadge,
              backgroundColor: VENDOR_COLORS[model.vendor],
            }}
          >
            {getVendorIcon(model.vendor)}
          </span>
        )}
      </div>
      <div style={styles.modelBadges}>
        {model.speedLevel && (
          <span
            style={{
              ...styles.badge,
              background: SPEED_COLORS[model.speedLevel],
            }}
          >
            {getSpeedIcon(model.speedLevel)}
            {model.speedLevel.charAt(0).toUpperCase() +
              model.speedLevel.slice(1)}
          </span>
        )}
        {model.isFree ? (
          <span
            style={{
              ...styles.badge,
              backgroundColor: "#43B581",
            }}
          >
            <FaCrown style={{ opacity: 0.5 }} /> Free
          </span>
        ) : model.isPremium ? (
          <span
            style={{
              ...styles.badge,
              backgroundColor: "#5865F2",
            }}
          >
            <FaCrown /> Premium
          </span>
        ) : null}
        {model.supports?.imageAttachments && (
          <span
            style={{
              ...styles.badge,
              backgroundColor: "#43B581",
            }}
          >
            <FaImage /> Image
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={handleModalClick}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={styles.modalContent}
      >
        <div className="modal-header">
          <h3>Model Preferences</h3>
          <MdClose className="close-icon" onClick={onClose} />
        </div>

        <div style={styles.sectionTabs}>
          {["main", "programmer", "image"].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              style={{
                ...styles.sectionTab,
                backgroundColor:
                  activeSection === section ? "#5865F2" : "#2F3136",
              }}
            >
              {section === "main"
                ? "Main Agent"
                : section === "programmer"
                  ? "Programmer"
                  : "Image Generation"}
            </button>
          ))}
        </div>

        {activeSection !== "image" ? (
          <div style={styles.twoColumnLayout}>
            <div className="filter-section" style={styles.filterSection}>
              <div style={styles.filterGroup}>
                <span style={styles.filterLabel}>Speed</span>
                <div style={styles.filterButtons}>
                  {["slow", "medium", "fast", "insane"].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => toggleFilter("speed", speed)}
                      style={{
                        ...styles.filterButton,
                        background:
                          activeFilters.speed === speed
                            ? SPEED_COLORS[speed]
                            : "#2F3136",
                      }}
                    >
                      {getSpeedIcon(speed)}
                      {speed.charAt(0).toUpperCase() + speed.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.filterGroup}>
                <span style={styles.filterLabel}>Pricing</span>
                <div style={styles.filterButtons}>
                  <button
                    onClick={() => toggleFilter("pricing", "free")}
                    style={{
                      ...styles.filterButton,
                      backgroundColor:
                        activeFilters.pricing === "free"
                          ? "#43B581"
                          : "#2F3136",
                    }}
                  >
                    <FaCrown style={{ opacity: 0.5 }} /> Free
                  </button>
                  <button
                    onClick={() => toggleFilter("pricing", "premium")}
                    style={{
                      ...styles.filterButton,
                      backgroundColor:
                        activeFilters.pricing === "premium"
                          ? "#5865F2"
                          : "#2F3136",
                    }}
                  >
                    <FaCrown /> Premium
                  </button>
                </div>
              </div>

              <div style={styles.filterGroup}>
                <span style={styles.filterLabel}>Features</span>
                <div style={styles.filterButtons}>
                  <button
                    onClick={() =>
                      toggleFilter("imageSupport", !activeFilters.imageSupport)
                    }
                    style={{
                      ...styles.filterButton,
                      backgroundColor: activeFilters.imageSupport
                        ? "#5865F2"
                        : "#2F3136",
                    }}
                  >
                    <FaImage /> Image Attachment
                  </button>
                </div>
              </div>

              <div style={styles.filterGroup}>
                <span style={styles.filterLabel}>Vendor</span>
                <div style={styles.filterButtons}>
                  {Object.entries(VENDOR_COLORS).map(([vendor, color]) => (
                    <button
                      key={vendor}
                      onClick={() => toggleFilter("vendor", vendor)}
                      style={{
                        ...styles.filterButton,
                        backgroundColor:
                          activeFilters.vendor === vendor ? color : "#2F3136",
                      }}
                    >
                      {getVendorIcon(vendor)}
                      {vendor.charAt(0).toUpperCase() + vendor.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={styles.taggedModelsToggle}>
                <label style={styles.taggedModelsLabel}>
                  <input
                    type="checkbox"
                    checked={showTaggedModels}
                    onChange={(e) => setShowTaggedModels(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <span style={styles.taggedModelsText}>
                    Show tagged models
                    {showTaggedModels && (
                      <span style={styles.taggedModelsHint}>
                        Showing date-tagged versions
                      </span>
                    )}
                  </span>
                </label>
              </div>
            </div>

            <div style={styles.modelGridContainer}>
              <div style={styles.modelGrid}>
                {filteredModels.length > 0 ? (
                  filteredModels.map(renderModelCard)
                ) : (
                  <div style={styles.noResults}>
                    No models match the selected filters
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <div className="model-selector">
              <ModelDropdownImage
                value={preferences.imageGeneration}
                onChange={(model, size) =>
                  handleModelChange("imageGeneration", { model, size })
                }
                hasEnoughBalance={hasEnoughBalance}
                isOpen={openDropdown === "image"}
                onOpenChange={(isOpen) => {
                  if (isOpen) {
                    setOpenDropdown("image");
                  } else if (openDropdown === "image") {
                    setOpenDropdown(null);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  modalContent: {
    width: "90vw",
    maxWidth: "1200px",
    maxHeight: "90vh",
    backgroundColor: "#2F3136",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
  },
  twoColumnLayout: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: "16px",
    height: "calc(90vh - 120px)", // Subtract header and tabs height
    overflow: "hidden",
  },
  filterSection: {
    padding: "16px 24px",
    borderRight: "1px solid #1E1F22",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    overflowY: "auto",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  filterLabel: {
    color: "#B9BBBE",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  filterButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  filterButton: {
    padding: "8px 16px",
    borderRadius: "20px",
    border: "none",
    color: "#FFFFFF",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    "&:hover": {
      filter: "brightness(1.1)",
    },
  },
  modelCard: {
    padding: "16px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  modelCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  modelName: {
    fontSize: "16px",
    fontWeight: "600",
  },
  vendorBadge: {
    padding: "4px 8px",
    borderRadius: "4px",
    backgroundColor: "#2F3136",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  modelBadges: {
    display: "flex",
    gap: "8px",
  },
  badge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "600",
  },
  sectionTabs: {
    display: "flex",
    gap: "8px",
    padding: "16px 24px",
    borderBottom: "1px solid #1E1F22",
  },
  sectionTab: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    color: "#FFFFFF",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      filter: "brightness(1.1)",
    },
  },
  modelGridContainer: {
    overflowY: "auto",
    padding: "16px 24px",
  },
  modelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
    height: "fit-content",
  },
  noResults: {
    padding: "32px",
    textAlign: "center",
    color: "#B9BBBE",
    gridColumn: "1 / -1",
  },
  taggedModelsToggle: {
    marginTop: "auto", // Push to bottom of filter section
    padding: "8px 12px",
    borderTop: "1px solid #1E1F22",
    display: "flex",
    alignItems: "center",
  },
  taggedModelsLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "12px",
    color: "#B9BBBE",
  },
  checkbox: {
    width: "14px",
    height: "14px",
    cursor: "pointer",
    accentColor: "#5865F2",
  },
  taggedModelsText: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  taggedModelsHint: {
    color: "#5865F2",
    fontSize: "10px",
    fontStyle: "italic",
  },
};

export default ModelPreferencesModal;
