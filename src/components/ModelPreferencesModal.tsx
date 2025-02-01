import { useState, useEffect, MouseEvent } from "react";
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
import {
  ModelOption,
  Model,
  ModelPreferences,
  Vendor,
  ImageGenerationSize,
} from "../types/llm";
import { useCallback, useMemo } from "react";

interface ModelPreferencesModalProps {
  preferences: ModelPreferences;
  updatePreferences: (update: Partial<ModelPreferences>) => void;
  onClose: () => void;
  hasEnoughBalance: boolean;
}

interface ActiveFilters {
  speed: "slow" | "medium" | "fast" | "insane" | null;
  pricing: "free" | "premium" | null;
  imageSupport: boolean;
  vendor: Vendor | null;
}

const VENDOR_COLORS: Record<Vendor, string> = {
  google: "#4285F4",
  openai: "#00A67E",
  anthropic: "#5436DA",
  mistral: "#7A88FF",
  meta: "#0668E1",
  cerebras: "#FF4B4B",
};

const SPEED_COLORS: Record<NonNullable<ActiveFilters["speed"]>, string> = {
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
}: ModelPreferencesModalProps) {
  const [activeSection, setActiveSection] = useState<
    "main" | "programmer" | "image"
  >("main");
  const [openDropdown, setOpenDropdown] = useState<
    "main" | "programmer" | "image" | null
  >(null);
  const [showTaggedModels, setShowTaggedModels] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    speed: null,
    pricing: null,
    imageSupport: false,
    vendor: null,
  });

  const faFireStyle = useMemo(() => ({ color: "#FF0000" }), []);
  const faCrownStyle = useMemo(() => ({ opacity: 0.5 }), []);
  const MemoizedFaImage = useMemo(() => <FaImage />, []);
  const MemoizedMdClose = useMemo(() => <MdClose className="close-icon" />, []);
  const MemoizedFaCrownFree = useMemo(
    () => <FaCrown style={faCrownStyle} />,
    []
  );
  const MemoizedFaCrownPremium = useMemo(() => <FaCrown />, []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(".model-dropdown") ||
      target.closest(".dropdown-option") ||
      target.closest(".model-selector") ||
      target.closest(".selected-value")
    ) {
      return;
    }
    setOpenDropdown(null);
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside as any);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside as any);
  }, [handleClickOutside]);

  const handleModalClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleModelChange = useCallback(
    (key: keyof ModelPreferences, value: any) => {
      updatePreferences({ [key]: value });
      setOpenDropdown(null);
    },
    [updatePreferences]
  );

  const toggleFilter = useCallback(
    (filterType: keyof ActiveFilters, value: any) => {
      setActiveFilters((prev) => ({
        ...prev,
        [filterType]: prev[filterType] === value ? null : value,
      }));
    },
    []
  );

  const getSpeedButtonColor = useCallback(
    (speed: ActiveFilters["speed"]) => {
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
    },
    [activeFilters.speed]
  );

  const getSpeedIcon = useCallback(
    (speed: ActiveFilters["speed"]) => {
      switch (speed) {
        case "slow":
          return <FaClock />;
        case "medium":
          return <FaRobot />;
        case "fast":
          return <FaBolt />;
        case "insane":
          return <FaFire style={faFireStyle} />;
        default:
          return null;
      }
    },
    [faFireStyle]
  );

  const getVendorIcon = useCallback((vendor: Vendor) => {
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
  }, []);

  const renderModelCard = useCallback(
    (model: ModelOption) => (
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
              {MemoizedFaCrownFree} Free
            </span>
          ) : model.isPremium ? (
            <span
              style={{
                ...styles.badge,
                backgroundColor: "#5865F2",
              }}
            >
              {MemoizedFaCrownPremium} Premium
            </span>
          ) : null}
          {model.supports?.imageAttachments && (
            <span
              style={{
                ...styles.badge,
                backgroundColor: "#43B581",
              }}
            >
              {MemoizedFaImage} Image
            </span>
          )}
        </div>
      </div>
    ),
    [
      activeSection,
      faCrownStyle,
      getSpeedIcon,
      getVendorIcon,
      handleModelChange,
      preferences,
      MemoizedFaImage,
      MemoizedFaCrownFree,
      MemoizedFaCrownPremium,
    ]
  );

  const filteredModels = useMemo(() => {
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

    return filtered;
  }, [activeFilters, showTaggedModels]);

  return (
    <div className="modal-overlay" onClick={handleModalClick}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={styles.modalContent}
      >
        <div className="modal-header">
          <h3>Model Preferences</h3>
          <div onClick={onClose}>{MemoizedMdClose}</div>
        </div>

        <div style={styles.sectionTabs}>
          {["main", "programmer", "image"].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section as typeof activeSection)}
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
                            ? SPEED_COLORS[speed as keyof typeof SPEED_COLORS]
                            : "#2F3136",
                      }}
                    >
                      {getSpeedIcon(speed as ActiveFilters["speed"])}
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
                    {MemoizedFaCrownFree} Free
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
                    {MemoizedFaCrownPremium} Premium
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
                    {MemoizedFaImage} Image Attachment
                  </button>
                </div>
              </div>

              <div style={styles.filterGroup}>
                <span style={styles.filterLabel}>Vendor</span>
                <div style={styles.filterButtons}>
                  {Object.entries(VENDOR_COLORS).map(([vendor, color]) => (
                    <button
                      key={vendor}
                      onClick={() => toggleFilter("vendor", vendor as Vendor)}
                      style={{
                        ...styles.filterButton,
                        backgroundColor:
                          activeFilters.vendor === vendor ? color : "#2F3136",
                      }}
                    >
                      {getVendorIcon(vendor as Vendor)}
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
                onChange={(model: Model, size: ImageGenerationSize) =>
                  handleModelChange("imageGeneration", { model, size })
                }
                hasEnoughBalance={hasEnoughBalance}
                isOpen={openDropdown === "image"}
                onOpenChange={(isOpen: boolean) => {
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
    position: "relative",
    "@media (max-width: 768px)": {
      width: "100%",
      maxWidth: "100%",
      height: "100vh",
      maxHeight: "100vh",
      margin: 0,
      borderRadius: 0,
      overflow: "hidden",
    },
  },
  twoColumnLayout: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    gap: "16px",
    height: "calc(90vh - 120px)",
    overflow: "hidden",
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
      height: "calc(100vh - 120px)",
      overflow: "auto",
      gap: 0,
    },
  },
  filterSection: {
    padding: "16px 24px",
    borderRight: "1px solid #1E1F22",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    overflowY: "auto",
    "@media (max-width: 768px)": {
      padding: "12px 16px",
      borderRight: "none",
      borderBottom: "1px solid #1E1F22",
      overflowY: "visible",
      width: "100%",
      boxSizing: "border-box",
    },
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
    "@media (max-width: 768px)": {
      gap: "6px",
      width: "100%",
      justifyContent: "flex-start",
    },
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
    whiteSpace: "nowrap",
    "&:hover": {
      filter: "brightness(1.1)",
    },
    "@media (max-width: 768px)": {
      padding: "6px 12px",
      fontSize: "13px",
      gap: "6px",
      flex: "0 1 auto",
    },
  },
  modelCard: {
    padding: "16px",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "@media (max-width: 768px)": {
      padding: "12px",
      width: "100%",
      boxSizing: "border-box",
    },
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
    flexWrap: "wrap",
    "@media (max-width: 768px)": {
      gap: "6px",
    },
  },
  badge: {
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  sectionTabs: {
    display: "flex",
    gap: "8px",
    padding: "16px 24px",
    borderBottom: "1px solid #1E1F22",
    "@media (max-width: 768px)": {
      padding: "12px 16px",
      gap: "6px",
      width: "100%",
      boxSizing: "border-box",
      justifyContent: "space-between",
    },
  },
  sectionTab: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    color: "#FFFFFF",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    "&:hover": {
      filter: "brightness(1.1)",
    },
    "@media (max-width: 768px)": {
      padding: "6px 12px",
      fontSize: "13px",
      flex: "1 1 auto",
      textAlign: "center",
    },
  },
  modelGridContainer: {
    overflowY: "auto",
    padding: "16px 24px",
    "@media (max-width: 768px)": {
      padding: "12px 16px",
      overflowY: "visible",
      width: "100%",
      boxSizing: "border-box",
    },
  },
  modelGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "16px",
    height: "fit-content",
    "@media (max-width: 768px)": {
      gridTemplateColumns: "1fr",
      gap: "12px",
      width: "100%",
    },
  },
  noResults: {
    padding: "32px",
    textAlign: "center",
    color: "#B9BBBE",
    gridColumn: "1 / -1",
  },
  taggedModelsToggle: {
    marginTop: "auto",
    padding: "8px 12px",
    borderTop: "1px solid #1E1F22",
    display: "flex",
    alignItems: "center",
    "@media (max-width: 768px)": {
      marginTop: "12px",
      padding: "8px 0",
    },
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
} as const;

export default ModelPreferencesModal;
