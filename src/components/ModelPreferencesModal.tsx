import { useState } from "react";
import { MdClose } from "react-icons/md";
import { MdKeyboardArrowRight } from "react-icons/md";
import { DEFAULT_MODELS, IMAGE_GENERATION_MODELS } from "../constants";
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
import { ModelOption, Model, ModelPreferences, Vendor } from "../types/llm";
import { useCallback, useMemo } from "react";
import "./ModelPreferencesModal.css";
import { useModelPreferences } from "@/hooks/useModelPreferences";
interface ModelPreferencesModalProps {
  onClose: () => void;
}

interface ActiveFilters {
  speed: "slow" | "medium" | "fast" | "insane" | null;
  pricing: "free" | "premium" | null;
  imageSupport: boolean;
  vendor: Vendor | null;
}

interface ImageFilters {
  provider: "openai" | null;
  dimensions: "square" | "landscape" | "portrait" | null;
  quality: "low" | "medium" | "hd" | null;
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

export default function ModelPreferencesModal({
  onClose,
}: ModelPreferencesModalProps) {
  const { preferences, updatePreferences } = useModelPreferences();
  const [activeSection, setActiveSection] = useState<
    "main" | "programmer" | "image"
  >("main");
  const [showTaggedModels, setShowTaggedModels] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    speed: null,
    pricing: null,
    imageSupport: false,
    vendor: null,
  });
  const [imageFilters, setImageFilters] = useState<ImageFilters>({
    provider: null,
    dimensions: null,
    quality: null,
  });
  const [expandedImageModel, setExpandedImageModel] = useState<Model | null>(
    null
  );

  const faFireStyle = useMemo(() => ({ color: "#FF0000" }), []);
  const faCrownStyle = useMemo(() => ({ opacity: 0.5 }), []);
  const MemoizedFaImage = useMemo(() => <FaImage />, []);
  const MemoizedMdClose = useMemo(() => <MdClose className="close-icon" />, []);
  const MemoizedFaCrownFree = useMemo(
    () => <FaCrown style={faCrownStyle} />,
    [faCrownStyle]
  );
  const MemoizedFaCrownPremium = useMemo(() => <FaCrown />, []);

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
    (model: ModelOption) => {
      if (!preferences) return null;
      return (
        <div
          key={model.id}
          onClick={() =>
            handleModelChange(
              activeSection === "main" ? "mainModel" : "programmerModel",
              model.id
            )
          }
          className={`model-card ${
            model.id ===
            preferences[
              activeSection === "main" ? "mainModel" : "programmerModel"
            ]
              ? "selected"
              : ""
          }`}
        >
          <div className="model-card-header">
            <span className="model-name">{model.name}</span>
            {model.vendor && (
              <span
                className="vendor-badge"
                style={{
                  backgroundColor: VENDOR_COLORS[model.vendor],
                }}
              >
                {getVendorIcon(model.vendor)}
              </span>
            )}
          </div>
          <div className="model-badges">
            {model.speedLevel && (
              <span
                className="badge"
                style={{
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
                className="badge"
                style={{
                  backgroundColor: "#43B581",
                }}
              >
                {MemoizedFaCrownFree} Free
              </span>
            ) : model.isPremium ? (
              <span
                className="badge"
                style={{
                  backgroundColor: "#5865F2",
                }}
              >
                {MemoizedFaCrownPremium} Premium
              </span>
            ) : null}
            {model.supports?.imageAttachments && (
              <span
                className="badge"
                style={{
                  backgroundColor: "#43B581",
                }}
              >
                {MemoizedFaImage} Image
              </span>
            )}
          </div>
        </div>
      );
    },
    [
      activeSection,
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

  const renderImageModelCard = useCallback(
    (model: ModelOption) => {
      if (!preferences) return null;
      return (
        <div
          key={model.id}
          className={`model-card ${
            model.id === preferences.imageGeneration.model ? "selected" : ""
          }`}
          onClick={() => {
            setExpandedImageModel(
              expandedImageModel === model.id ? null : model.id
            );
          }}
        >
          <div className="model-card-content">
            <div className="model-name-with-arrow">
              <MdKeyboardArrowRight
                className={`dropdown-arrow ${
                  expandedImageModel === model.id ? "rotated" : ""
                }`}
              />
              <span className="model-name">{model.name}</span>
            </div>
            {model.vendor && (
              <span
                className="vendor-badge"
                style={{
                  backgroundColor: VENDOR_COLORS[model.vendor],
                }}
              >
                {getVendorIcon(model.vendor)}
              </span>
            )}
          </div>
          <div className="model-badges">
            {model.isPremium && (
              <span
                className="badge"
                style={{
                  backgroundColor: "#5865F2",
                }}
              >
                {MemoizedFaCrownPremium} Premium
              </span>
            )}
            {model.id.includes("hd") && (
              <span
                className="badge"
                style={{
                  backgroundColor: "#FAA61A",
                }}
              >
                HD Quality
              </span>
            )}
          </div>
          {expandedImageModel === model.id && model.sizeOptions && (
            <div className="dimension-options">
              {model.sizeOptions.map((size) => (
                <button
                  key={size.wh}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card collapse when selecting size
                    handleModelChange("imageGeneration", {
                      model: model.id,
                      size,
                    });
                  }}
                  className={`dimension-button ${
                    model.id === preferences.imageGeneration.model &&
                    size.wh === preferences.imageGeneration.size.wh
                      ? "selected"
                      : ""
                  }`}
                >
                  {size.description}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    },
    [
      expandedImageModel,
      getVendorIcon,
      handleModelChange,
      preferences,
      MemoizedFaCrownPremium,
    ]
  );

  const filteredImageModels = useMemo(() => {
    let filtered = [...IMAGE_GENERATION_MODELS];

    if (imageFilters.provider) {
      filtered = filtered.filter(
        (model) => model.vendor === imageFilters.provider
      );
    }

    if (imageFilters.quality) {
      switch (imageFilters.quality) {
        case "hd":
          filtered = filtered.filter((model) => model.id.includes("hd"));
          break;
        case "medium":
          filtered = filtered.filter((model) => model.id === "dall-e-3");
          break;
        case "low":
          filtered = filtered.filter((model) => model.id === "dall-e-2");
          break;
      }
    }

    return filtered;
  }, [imageFilters]);

  const toggleImageFilter = useCallback(
    (filterType: keyof ImageFilters, value: any) => {
      setImageFilters((prev) => ({
        ...prev,
        [filterType]: prev[filterType] === value ? null : value,
      }));
    },
    []
  );

  if (!preferences) return null;

  return (
    <div className="modal-overlay" onClick={handleModalClick}>
      <div
        className="modal-content model-preferences-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Model Preferences</h3>
          <div onClick={onClose}>{MemoizedMdClose}</div>
        </div>

        <div className="section-tabs">
          {["main", "programmer", "image"].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section as typeof activeSection)}
              className={`section-tab ${
                activeSection === section ? "active-tab" : ""
              }`}
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
          <div className="two-column-layout">
            <div className="filter-section">
              <div className="filter-group">
                <span className="filter-label">Speed</span>
                <div className="filter-buttons">
                  {["slow", "medium", "fast", "insane"].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => toggleFilter("speed", speed)}
                      className={`filter-button ${
                        activeFilters.speed === speed ? "active-filter" : ""
                      }`}
                      style={{
                        background:
                          activeFilters.speed === speed
                            ? SPEED_COLORS[speed as keyof typeof SPEED_COLORS]
                            : undefined,
                      }}
                    >
                      {getSpeedIcon(speed as ActiveFilters["speed"])}
                      {speed.charAt(0).toUpperCase() + speed.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Pricing</span>
                <div className="filter-buttons">
                  <button
                    onClick={() => toggleFilter("pricing", "free")}
                    className={`filter-button ${
                      activeFilters.pricing === "free" ? "active-filter" : ""
                    }`}
                  >
                    {MemoizedFaCrownFree} Free
                  </button>
                  <button
                    onClick={() => toggleFilter("pricing", "premium")}
                    className={`filter-button ${
                      activeFilters.pricing === "premium" ? "active-filter" : ""
                    }`}
                  >
                    {MemoizedFaCrownPremium} Premium
                  </button>
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Features</span>
                <div className="filter-buttons">
                  <button
                    onClick={() =>
                      toggleFilter("imageSupport", !activeFilters.imageSupport)
                    }
                    className={`filter-button ${
                      activeFilters.imageSupport ? "active-filter" : ""
                    }`}
                  >
                    {MemoizedFaImage} Image Attachment
                  </button>
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Vendor</span>
                <div className="filter-buttons">
                  {Object.entries(VENDOR_COLORS).map(([vendor, color]) => (
                    <button
                      key={vendor}
                      onClick={() => toggleFilter("vendor", vendor as Vendor)}
                      className={`filter-button ${
                        activeFilters.vendor === vendor ? "active-filter" : ""
                      }`}
                      style={{
                        background:
                          activeFilters.vendor === vendor ? color : undefined,
                      }}
                    >
                      {getVendorIcon(vendor as Vendor)}
                      {vendor.charAt(0).toUpperCase() + vendor.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="tagged-models-toggle">
                <label className="tagged-models-label">
                  <input
                    type="checkbox"
                    checked={showTaggedModels}
                    onChange={(e) => setShowTaggedModels(e.target.checked)}
                    className="checkbox"
                  />
                  <span className="tagged-models-text">
                    Show tagged models
                    {showTaggedModels && (
                      <span className="tagged-models-hint">
                        Showing date-tagged versions
                      </span>
                    )}
                  </span>
                </label>
              </div>
            </div>

            <div className="model-grid-container">
              <div className="model-grid">
                {filteredModels.length > 0 ? (
                  filteredModels.map(renderModelCard)
                ) : (
                  <div className="no-results">
                    No models match the selected filters
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="two-column-layout">
            <div className="filter-section">
              <div className="filter-group">
                <span className="filter-label">Provider</span>
                <div className="filter-buttons">
                  <button
                    onClick={() => toggleImageFilter("provider", "openai")}
                    className={`filter-button ${
                      imageFilters.provider === "openai" ? "active-filter" : ""
                    }`}
                    style={{
                      background:
                        imageFilters.provider === "openai"
                          ? VENDOR_COLORS.openai
                          : undefined,
                    }}
                  >
                    <SiOpenai /> OpenAI
                  </button>
                </div>
              </div>

              <div className="filter-group">
                <span className="filter-label">Quality</span>
                <div className="filter-buttons">
                  {[
                    { id: "low", label: "Basic" },
                    { id: "medium", label: "Standard" },
                    { id: "hd", label: "HD" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      onClick={() =>
                        toggleImageFilter(
                          "quality",
                          id as ImageFilters["quality"]
                        )
                      }
                      className={`filter-button ${
                        imageFilters.quality === id ? "active-filter" : ""
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="model-grid-container">
              <div className="model-grid">
                {filteredImageModels.length > 0 ? (
                  filteredImageModels.map(renderImageModelCard)
                ) : (
                  <div className="no-results">
                    No models match the selected filters
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
