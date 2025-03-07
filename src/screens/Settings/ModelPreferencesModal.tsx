import { useState, useEffect, Fragment } from "react";
import {
  MdKeyboardArrowRight,
  MdExpandMore,
  MdExpandLess,
  MdFilterAlt,
} from "react-icons/md";
import { DEFAULT_MODELS, IMAGE_GENERATION_MODELS } from "@/constants";
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
import { ModelOption, Model, ModelPreferences, Vendor } from "@/types/llm";
import { useCallback, useMemo } from "react";
import "./ModelPreferencesModal.css";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { usePlatform } from "@/hooks/usePlatform";

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

export default function ModelPreferencesModal() {
  const { preferences, updatePreferences, isLoading } = useModelPreferences();
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
    null,
  );

  const { isMobile } = usePlatform();
  const [isCompactView, setIsCompactView] = useState(false);

  // Check if we should use compact view based on screen width
  useEffect(() => {
    const checkViewportWidth = () => {
      setIsCompactView(window.innerWidth < 1100);
    };

    checkViewportWidth();
    window.addEventListener("resize", checkViewportWidth);

    return () => {
      window.removeEventListener("resize", checkViewportWidth);
    };
  }, []);

  // State for mobile filter section visibility
  const [isFilterSectionExpanded, setIsFilterSectionExpanded] = useState(false);

  // State for collapsible filter groups - collapsed by default on mobile/compact view, expanded on desktop
  const [expandedFilters, setExpandedFilters] = useState<{
    speed: boolean;
    pricing: boolean;
    features: boolean;
    vendor: boolean;
    provider: boolean;
    dimensions: boolean;
    quality: boolean;
  }>({
    speed: !isMobile && !isCompactView,
    pricing: !isMobile && !isCompactView,
    features: !isMobile && !isCompactView,
    vendor: !isMobile && !isCompactView,
    provider: !isMobile && !isCompactView,
    dimensions: !isMobile && !isCompactView,
    quality: !isMobile && !isCompactView,
  });

  // Update expanded filters when mobile or compact view state changes
  useEffect(() => {
    const isCollapsedLayout = isMobile || isCompactView;
    if (!isCollapsedLayout) {
      setExpandedFilters({
        speed: true,
        pricing: true,
        features: true,
        vendor: true,
        provider: true,
        dimensions: true,
        quality: true,
      });
    } else {
      setExpandedFilters({
        speed: false,
        pricing: false,
        features: false,
        vendor: false,
        provider: false,
        dimensions: false,
        quality: false,
      });
    }
  }, [isMobile, isCompactView]);

  const faFireStyle = useMemo(() => ({ color: "#FF0000" }), []);
  const faCrownStyle = useMemo(() => ({ opacity: 0.5 }), []);
  const MemoizedFaImage = useMemo(() => <FaImage />, []);
  const MemoizedFaCrownFree = useMemo(
    () => <FaCrown style={faCrownStyle} />,
    [faCrownStyle],
  );
  const MemoizedFaCrownPremium = useMemo(() => <FaCrown />, []);

  const handleModelChange = useCallback(
    (key: keyof ModelPreferences, value: any) => {
      updatePreferences({ [key]: value });
    },
    [updatePreferences],
  );

  const toggleFilter = useCallback(
    (filterType: keyof ActiveFilters, value: any) => {
      setActiveFilters((prev) => ({
        ...prev,
        [filterType]: prev[filterType] === value ? null : value,
      }));
    },
    [],
  );

  // Toggle filter group expansion
  const toggleFilterGroup = useCallback(
    (filterGroup: keyof typeof expandedFilters) => {
      setExpandedFilters((prev) => ({
        ...prev,
        [filterGroup]: !prev[filterGroup],
      }));
    },
    [],
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
    [faFireStyle],
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

  // Get the currently selected model details
  const getSelectedModelDetails = useCallback(
    (modelType: "mainModel" | "programmerModel" | "imageGeneration") => {
      if (!preferences) return null;

      if (modelType === "imageGeneration") {
        const selectedModel = IMAGE_GENERATION_MODELS.find(
          (model) => model.id === preferences.imageGeneration.model,
        );
        return selectedModel;
      }

      const selectedModel = DEFAULT_MODELS.find(
        (model) => model.id === preferences[modelType],
      );
      return selectedModel;
    },
    [preferences],
  );

  const renderModelCard = useCallback(
    (model: ModelOption) => {
      if (!preferences) return null;
      return (
        <div
          key={model.id}
          onClick={() =>
            handleModelChange(
              activeSection === "main" ? "mainModel" : "programmerModel",
              model.id,
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
    ],
  );

  const filteredModels = useMemo(() => {
    let filtered = [...DEFAULT_MODELS];

    // Filter tagged/untagged models
    filtered = filtered.filter((model) =>
      showTaggedModels ? model.isTaggedModel : !model.isTaggedModel,
    );

    if (activeFilters.speed) {
      filtered = filtered.filter(
        (model) => model.speedLevel === activeFilters.speed,
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
        (model) => model.vendor === activeFilters.vendor,
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
              expandedImageModel === model.id ? null : model.id,
            );
          }}
        >
          <div className="model-card-content">
            <div className="model-name-with-arrow">
              <MdKeyboardArrowRight
                className={`dropdown-arrow ${expandedImageModel === model.id ? "rotated" : ""}`}
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
    ],
  );

  const filteredImageModels = useMemo(() => {
    let filtered = [...IMAGE_GENERATION_MODELS];

    if (imageFilters.provider) {
      filtered = filtered.filter(
        (model) => model.vendor === imageFilters.provider,
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
    [],
  );

  // Render selected model indicator
  const renderSelectedModelIndicator = useCallback(() => {
    if (!preferences) return null;

    const modelType =
      activeSection === "main"
        ? "mainModel"
        : activeSection === "programmer"
          ? "programmerModel"
          : "imageGeneration";

    const selectedModel = getSelectedModelDetails(modelType);
    if (!selectedModel) return null;

    return (
      <div className="selected-model-indicator">
        <div className="selected-model-title">
          {activeSection === "main"
            ? "Selected Main Agent"
            : activeSection === "programmer"
              ? "Selected Programmer"
              : "Selected Image Generator"}
        </div>
        <div className="selected-model-name">
          <span>{selectedModel.name}</span>
          {selectedModel.vendor && (
            <span
              className="vendor-badge"
              style={{
                backgroundColor: VENDOR_COLORS[selectedModel.vendor],
              }}
            >
              {getVendorIcon(selectedModel.vendor)}
            </span>
          )}
        </div>
        <div className="selected-model-badges">
          {selectedModel.speedLevel && (
            <span
              className="badge"
              style={{
                background: SPEED_COLORS[selectedModel.speedLevel],
              }}
            >
              {getSpeedIcon(selectedModel.speedLevel)}
              {selectedModel.speedLevel.charAt(0).toUpperCase() +
                selectedModel.speedLevel.slice(1)}
            </span>
          )}
          {selectedModel.isFree ? (
            <span
              className="badge"
              style={{
                backgroundColor: "#43B581",
              }}
            >
              {MemoizedFaCrownFree} Free
            </span>
          ) : selectedModel.isPremium ? (
            <span
              className="badge"
              style={{
                backgroundColor: "#5865F2",
              }}
            >
              {MemoizedFaCrownPremium} Premium
            </span>
          ) : null}
          {selectedModel.supports?.imageAttachments && (
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
  }, [
    activeSection,
    getSelectedModelDetails,
    getSpeedIcon,
    getVendorIcon,
    preferences,
    MemoizedFaCrownFree,
    MemoizedFaCrownPremium,
    MemoizedFaImage,
  ]);

  // Compact version of renderModelCard for mobile
  const renderCompactModelCard = useCallback(
    (model: ModelOption) => {
      if (!preferences) return null;

      const isSelected =
        model.id ===
        preferences[activeSection === "main" ? "mainModel" : "programmerModel"];

      return (
        <div
          key={model.id}
          onClick={() =>
            handleModelChange(
              activeSection === "main" ? "mainModel" : "programmerModel",
              model.id,
            )
          }
          className={`model-card ${isSelected ? "selected" : ""}`}
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
                {!isMobile && isCompactView && (
                  <span className="badge-text">
                    {model.speedLevel.charAt(0).toUpperCase() +
                      model.speedLevel.slice(1)}
                  </span>
                )}
              </span>
            )}
            {model.isFree && (
              <span
                className="badge"
                style={{
                  backgroundColor: "#43B581",
                }}
              >
                {MemoizedFaCrownFree}
                {!isMobile && isCompactView && (
                  <span className="badge-text">Free</span>
                )}
              </span>
            )}
            {model.isPremium && (
              <span
                className="badge"
                style={{
                  backgroundColor: "#5865F2",
                }}
              >
                {MemoizedFaCrownPremium}
                {!isMobile && isCompactView && (
                  <span className="badge-text">Premium</span>
                )}
              </span>
            )}
            {model.supports?.imageAttachments && (
              <span
                className="badge"
                style={{
                  backgroundColor: "#43B581",
                }}
              >
                {MemoizedFaImage}
                {!isMobile && isCompactView && (
                  <span className="badge-text">Image</span>
                )}
              </span>
            )}
          </div>
          {isSelected && (
            <div className="selected-indicator">
              <div className="selected-dot"></div>
            </div>
          )}
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
      isMobile,
      isCompactView,
    ],
  );

  // Compact version of renderImageModelCard for mobile and compact view
  const renderCompactImageModelCard = useCallback(
    (model: ModelOption) => {
      if (!preferences) return null;

      const isSelected = model.id === preferences.imageGeneration.model;
      const isExpanded = expandedImageModel === model.id;

      return (
        <div
          key={model.id}
          className={`model-card ${isSelected ? "selected" : ""} ${isExpanded ? "expanded" : ""}`}
          onClick={() => {
            setExpandedImageModel(
              expandedImageModel === model.id ? null : model.id,
            );
          }}
        >
          <div className="model-card-content">
            <div className="model-name-with-arrow">
              <MdKeyboardArrowRight
                className={`dropdown-arrow ${isExpanded ? "rotated" : ""}`}
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
                {MemoizedFaCrownPremium}
                {!isMobile && isCompactView && (
                  <span className="badge-text">Premium</span>
                )}
              </span>
            )}
            {model.id.includes("hd") && (
              <span
                className="badge"
                style={{
                  backgroundColor: "#FAA61A",
                }}
              >
                {!isMobile && isCompactView ? "HD Quality" : "HD"}
              </span>
            )}
          </div>
          {isExpanded && model.sizeOptions && (
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
          {isSelected && !isExpanded && (
            <div className="selected-indicator">
              <div className="selected-dot"></div>
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
      isMobile,
      isCompactView,
    ],
  );

  // Toggle filter section visibility for mobile
  const toggleFilterSection = useCallback(() => {
    setIsFilterSectionExpanded((prev) => !prev);
  }, []);

  // Quick filter selection for mobile
  const handleQuickFilterSelect = useCallback(
    (filterType: keyof ActiveFilters, value: any) => {
      setActiveFilters((prev) => {
        // If the same filter is selected, clear it
        if (prev[filterType] === value) {
          return {
            ...prev,
            [filterType]: null,
          };
        }

        // Otherwise set the new filter value
        return {
          ...prev,
          [filterType]: value,
        };
      });
    },
    [],
  );

  if (!preferences) return null;

  return (
    <div className="model-preferences-content">
      <div className="section-tabs-container">
        <div className="section-tabs">
          {["main", "programmer", "image"].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section as typeof activeSection)}
              className={`section-tab ${activeSection === section ? "active-tab" : ""}`}
            >
              {section === "main"
                ? "Main Agent"
                : section === "programmer"
                  ? "Programmer"
                  : "Image Generation"}
            </button>
          ))}
        </div>
      </div>

      {activeSection !== "image" ? (
        <div className="two-column-layout">
          {(isMobile || isCompactView) && (
            <>
              {/* Selected model indicator for mobile/compact view */}
              {renderSelectedModelIndicator()}

              {/* MARK: - Filter Chips */}
              <div className="quick-filters">
                {/* Free/Premium quick filters */}
                <button
                  onClick={() => handleQuickFilterSelect("pricing", "free")}
                  className={`quick-filter-chip ${activeFilters.pricing === "free" ? "active" : ""}`}
                >
                  {MemoizedFaCrownFree} Free
                </button>

                {/* Speed quick filters */}
                {[
                  { speed: "fast", label: "Fast" },
                  { speed: "medium", label: "Smart" },
                ].map(({ speed, label }) => (
                  <Fragment key={speed}>
                    <button
                      onClick={() => handleQuickFilterSelect("speed", speed)}
                      className={`quick-filter-chip ${activeFilters.speed === speed ? "active" : ""}`}
                    >
                      {getSpeedIcon(speed as ActiveFilters["speed"])}
                      {label}
                    </button>
                  </Fragment>
                ))}

                {/* Image support quick filter */}
                <button
                  onClick={() =>
                    handleQuickFilterSelect(
                      "imageSupport",
                      !activeFilters.imageSupport,
                    )
                  }
                  className={`quick-filter-chip ${activeFilters.imageSupport ? "active" : ""}`}
                >
                  {MemoizedFaImage} Image
                </button>
              </div>

              {/* Collapsible filter section toggle */}
              <div
                className="filter-section-toggle"
                onClick={toggleFilterSection}
              >
                <span>Advanced Filters</span>
                <MdFilterAlt />
              </div>
            </>
          )}

          <div
            className={`filter-section ${isMobile || isCompactView ? "mobile" : ""}`}
          >
            <div
              className={`filter-section-content ${isMobile || isCompactView ? (isFilterSectionExpanded ? "expanded" : "") : "expanded"}`}
            >
              {/* Desktop selected model indicator */}
              {!isMobile && !isCompactView && (
                <>
                  {renderSelectedModelIndicator()}

                  {/* Add desktop quick filters */}
                  <div className="desktop-quick-filters">
                    {/* Free filter */}
                    <button
                      onClick={() => handleQuickFilterSelect("pricing", "free")}
                      className={`quick-filter-chip ${activeFilters.pricing === "free" ? "active" : ""}`}
                    >
                      {MemoizedFaCrownFree} Free
                    </button>

                    {/* Fast filter */}
                    <button
                      onClick={() => handleQuickFilterSelect("speed", "fast")}
                      className={`quick-filter-chip ${activeFilters.speed === "fast" ? "active" : ""}`}
                    >
                      {getSpeedIcon("fast")} Fast
                    </button>

                    {/* Smart (medium) filter */}
                    <button
                      onClick={() => handleQuickFilterSelect("speed", "medium")}
                      className={`quick-filter-chip ${activeFilters.speed === "medium" ? "active" : ""}`}
                    >
                      {getSpeedIcon("medium")} Smart
                    </button>

                    {/* Image support filter */}
                    <button
                      onClick={() =>
                        handleQuickFilterSelect(
                          "imageSupport",
                          !activeFilters.imageSupport,
                        )
                      }
                      className={`quick-filter-chip ${activeFilters.imageSupport ? "active" : ""}`}
                    >
                      {MemoizedFaImage} Image
                    </button>
                  </div>
                </>
              )}

              {/* Speed filter group */}
              <div className="filter-group">
                <div
                  className="filter-label"
                  onClick={() => toggleFilterGroup("speed")}
                >
                  <span className="filter-label-text">Speed</span>
                  <span className="chevron-icon">
                    {expandedFilters.speed ? (
                      <MdExpandLess />
                    ) : (
                      <MdExpandMore />
                    )}
                  </span>
                </div>
                <div
                  className={`filter-content ${expandedFilters.speed ? "expanded" : ""}`}
                >
                  <div className="filter-buttons">
                    {["slow", "medium", "fast", "insane"].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => toggleFilter("speed", speed)}
                        className={`filter-button ${activeFilters.speed === speed ? "active" : ""}`}
                        style={
                          activeFilters.speed === speed
                            ? {
                                background:
                                  SPEED_COLORS[
                                    speed as NonNullable<ActiveFilters["speed"]>
                                  ],
                              }
                            : {}
                        }
                      >
                        {getSpeedIcon(speed as ActiveFilters["speed"])}
                        {isMobile
                          ? ""
                          : speed.charAt(0).toUpperCase() + speed.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pricing filter group */}
              <div className="filter-group">
                <div
                  className="filter-label"
                  onClick={() => toggleFilterGroup("pricing")}
                >
                  <span className="filter-label-text">Pricing</span>
                  <span className="chevron-icon">
                    {expandedFilters.pricing ? (
                      <MdExpandLess />
                    ) : (
                      <MdExpandMore />
                    )}
                  </span>
                </div>
                <div
                  className={`filter-content ${expandedFilters.pricing ? "expanded" : ""}`}
                >
                  <div className="filter-buttons">
                    <button
                      onClick={() => toggleFilter("pricing", "free")}
                      className={`filter-button ${activeFilters.pricing === "free" ? "active" : ""}`}
                      style={
                        activeFilters.pricing === "free"
                          ? { backgroundColor: "#43B581" }
                          : {}
                      }
                    >
                      {MemoizedFaCrownFree} {isMobile ? "" : "Free"}
                    </button>
                    <button
                      onClick={() => toggleFilter("pricing", "premium")}
                      className={`filter-button ${activeFilters.pricing === "premium" ? "active" : ""}`}
                      style={
                        activeFilters.pricing === "premium"
                          ? { backgroundColor: "#5865F2" }
                          : {}
                      }
                    >
                      {MemoizedFaCrownPremium} {isMobile ? "" : "Premium"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Features filter group */}
              <div className="filter-group">
                <div
                  className="filter-label"
                  onClick={() => toggleFilterGroup("features")}
                >
                  <span className="filter-label-text">Features</span>
                  <span className="chevron-icon">
                    {expandedFilters.features ? (
                      <MdExpandLess />
                    ) : (
                      <MdExpandMore />
                    )}
                  </span>
                </div>
                <div
                  className={`filter-content ${expandedFilters.features ? "expanded" : ""}`}
                >
                  <div className="filter-buttons">
                    <button
                      onClick={() =>
                        toggleFilter(
                          "imageSupport",
                          !activeFilters.imageSupport,
                        )
                      }
                      className={`filter-button ${activeFilters.imageSupport ? "active" : ""}`}
                      style={
                        activeFilters.imageSupport
                          ? { backgroundColor: "#43B581" }
                          : {}
                      }
                    >
                      {MemoizedFaImage} {isMobile ? "" : "Image Attachment"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Vendor filter group */}
              <div className="filter-group">
                <div
                  className="filter-label"
                  onClick={() => toggleFilterGroup("vendor")}
                >
                  <span className="filter-label-text">Vendor</span>
                  <span className="chevron-icon">
                    {expandedFilters.vendor ? (
                      <MdExpandLess />
                    ) : (
                      <MdExpandMore />
                    )}
                  </span>
                </div>
                <div
                  className={`filter-content ${expandedFilters.vendor ? "expanded" : ""}`}
                >
                  <div className="filter-buttons">
                    {Object.entries(VENDOR_COLORS).map(([vendor, color]) => (
                      <button
                        key={vendor}
                        onClick={() => toggleFilter("vendor", vendor as Vendor)}
                        className={`filter-button ${activeFilters.vendor === vendor ? "active" : ""}`}
                        style={
                          activeFilters.vendor === vendor
                            ? { background: color }
                            : {}
                        }
                      >
                        {getVendorIcon(vendor as Vendor)}
                        {isMobile
                          ? ""
                          : vendor.charAt(0).toUpperCase() + vendor.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="tagged-models-toggle">
                <label className="tagged-models-label">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={showTaggedModels}
                    onChange={(e) => setShowTaggedModels(e.target.checked)}
                  />
                  <div className="tagged-models-text">
                    <span>Show tagged models</span>
                    {showTaggedModels && (
                      <span className="tagged-models-hint">
                        Showing date-tagged versions
                      </span>
                    )}
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="model-grid-container">
            <div className="model-grid">
              {filteredModels.length > 0 ? (
                isMobile || isCompactView ? (
                  filteredModels.map(renderCompactModelCard)
                ) : (
                  filteredModels.map(renderModelCard)
                )
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
          {(isMobile || isCompactView) && (
            <>
              {/* Selected model indicator for mobile/compact view */}
              {renderSelectedModelIndicator()}

              {/* Quick filter chips for image models */}
              <div className="quick-filters">
                {/* Provider quick filter */}
                <button
                  onClick={() => toggleImageFilter("provider", "openai")}
                  className={`quick-filter-chip ${imageFilters.provider === "openai" ? "active" : ""}`}
                >
                  <SiOpenai /> OpenAI
                </button>

                {/* Quality quick filters */}
                {[
                  { id: "hd", label: "HD" },
                  { id: "medium", label: "Medium" },
                  { id: "low", label: "Low" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => toggleImageFilter("quality", id)}
                    className={`quick-filter-chip ${imageFilters.quality === id ? "active" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Collapsible filter section toggle */}
              <div
                className="filter-section-toggle"
                onClick={toggleFilterSection}
              >
                <span>Advanced Filters</span>
                <MdFilterAlt />
              </div>
            </>
          )}

          <div
            className={`filter-section ${isMobile || isCompactView ? "mobile" : ""}`}
          >
            <div
              className={`filter-section-content ${isMobile || isCompactView ? (isFilterSectionExpanded ? "expanded" : "") : "expanded"}`}
            >
              {/* Desktop selected model indicator */}
              {!isMobile && !isCompactView && (
                <>
                  {renderSelectedModelIndicator()}

                  {/* Add desktop quick filters for image models */}
                  <div className="desktop-quick-filters">
                    {/* OpenAI filter */}
                    <button
                      onClick={() => toggleImageFilter("provider", "openai")}
                      className={`quick-filter-chip ${imageFilters.provider === "openai" ? "active" : ""}`}
                    >
                      <SiOpenai /> OpenAI
                    </button>

                    {/* Quality quick filters */}
                    {[
                      { id: "hd", label: "HD" },
                      { id: "medium", label: "Medium" },
                      { id: "low", label: "Low" },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => toggleImageFilter("quality", id)}
                        className={`quick-filter-chip ${imageFilters.quality === id ? "active" : ""}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Provider filter */}
              <div className="filter-group">
                <div
                  className="filter-label"
                  onClick={() => toggleFilterGroup("provider")}
                >
                  <span className="filter-label-text">Provider</span>
                  <span className="chevron-icon">
                    {expandedFilters.provider ? (
                      <MdExpandLess />
                    ) : (
                      <MdExpandMore />
                    )}
                  </span>
                </div>
                <div
                  className={`filter-content ${expandedFilters.provider ? "expanded" : ""}`}
                >
                  <div className="filter-buttons">
                    <button
                      onClick={() => toggleImageFilter("provider", "openai")}
                      className={`filter-button ${imageFilters.provider === "openai" ? "active" : ""}`}
                      style={
                        imageFilters.provider === "openai"
                          ? { backgroundColor: VENDOR_COLORS.openai }
                          : {}
                      }
                    >
                      <SiOpenai /> {isMobile ? "" : "OpenAI"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dimensions filter */}
              <div className="filter-group">
                <div
                  className="filter-label"
                  onClick={() => toggleFilterGroup("dimensions")}
                >
                  <span className="filter-label-text">Dimensions</span>
                  <span className="chevron-icon">
                    {expandedFilters.dimensions ? (
                      <MdExpandLess />
                    ) : (
                      <MdExpandMore />
                    )}
                  </span>
                </div>
                <div
                  className={`filter-content ${expandedFilters.dimensions ? "expanded" : ""}`}
                >
                  <div className="filter-buttons">
                    {[
                      { id: "square", label: "Square" },
                      { id: "landscape", label: "Landscape" },
                      { id: "portrait", label: "Portrait" },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => toggleImageFilter("dimensions", id)}
                        className={`filter-button ${imageFilters.dimensions === id ? "active" : ""}`}
                      >
                        {isMobile ? label.charAt(0) : label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quality filter */}
              <div className="filter-group">
                <div
                  className="filter-label"
                  onClick={() => toggleFilterGroup("quality")}
                >
                  <span className="filter-label-text">Quality</span>
                  <span className="chevron-icon">
                    {expandedFilters.quality ? (
                      <MdExpandLess />
                    ) : (
                      <MdExpandMore />
                    )}
                  </span>
                </div>
                <div
                  className={`filter-content ${expandedFilters.quality ? "expanded" : ""}`}
                >
                  <div className="filter-buttons">
                    {[
                      { id: "hd", label: "HD" },
                      { id: "medium", label: "Medium" },
                      { id: "low", label: "Low" },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => toggleImageFilter("quality", id)}
                        className={`filter-button ${imageFilters.quality === id ? "active" : ""}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="model-grid-container">
            <div className="model-grid">
              {filteredImageModels.length > 0 ? (
                isMobile || isCompactView ? (
                  filteredImageModels.map(renderCompactImageModelCard)
                ) : (
                  filteredImageModels.map(renderImageModelCard)
                )
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
  );
}
