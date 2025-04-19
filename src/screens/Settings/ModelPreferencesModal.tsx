import { useState, useEffect, Fragment } from "react";
import {
  MdExpandMore,
  MdExpandLess,
  MdFilterAlt,
  MdInfoOutline,
} from "react-icons/md";
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
  FaStar,
} from "react-icons/fa";
import { SiOpenai } from "react-icons/si";
import { TbBrandMeta } from "react-icons/tb";
import { Model, ModelPreferences, Vendor } from "@/types/llm";
import { useCallback, useMemo } from "react";
import "./ModelPreferencesModal.css";
import { useModelPreferences } from "@/hooks/useModelPreferences";
import { usePlatform } from "@/hooks/usePlatform";
import { useUser } from "@/hooks/useUser";
import { useImageModels, usePromptModels } from "@/hooks/useServices";
import { LLMModel, ImageModel } from "@/api/services";
import { IMAGE_GENERATION_SIZES } from "@/constants";

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

const SPEED_COLORS: Record<string, string> = {
  1: "#ED4245",
  2: "#FAA61A",
  3: "#43B581",
  4: "#FFD700",
  5: "linear-gradient(45deg, #FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #4B0082, #8F00FF)",
};

// Stat labels used in the model cards
const SPEED_LEVELS = {
  1: "Slow",
  2: "Moderate",
  3: "Fast",
  4: "Very Fast",
  5: "Ultra Fast",
};

const redirectToGeneralTab = () => {
  const generalTab = document.querySelector(
    '.modal-tab[data-tab-id="general"]',
  );
  if (generalTab) {
    (generalTab as HTMLElement).click();
  }
};

export const ModelPreferencesModal: React.FC = () => {
  const { preferences, updatePreferences } = useModelPreferences();
  const { data: user } = useUser();
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
  // No longer using expandedImageModel
  const [expandedModelDetails, setExpandedModelDetails] = useState<
    string | null
  >(null);

  const { isMobile } = usePlatform();
  const [isCompactView, setIsCompactView] = useState(false);

  // Fetch models from API
  const { data: promptModels, isLoading: isLoadingModels } = usePromptModels();
  const { data: imageModels, isLoading: isLoadingImageModels } =
    useImageModels();

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
    (key: keyof ModelPreferences, value: string | Record<string, unknown>) => {
      updatePreferences({ [key]: value });
    },
    [updatePreferences],
  );

  const toggleFilter = useCallback(
    (filterType: keyof ActiveFilters, value: string | boolean | null) => {
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
    (level: number) => {
      if (level <= 2) return <FaClock />;
      if (level <= 3) return <FaRobot />;
      if (level <= 4) return <FaBolt />;
      return <FaFire style={faFireStyle} />;
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
      if (!preferences || !promptModels || !imageModels) return null;

      if (modelType === "imageGeneration") {
        const selectedModel = imageModels.find(
          (model) => model.name === preferences.imageGeneration.model,
        );
        return selectedModel;
      }

      // Find the model from the API instead of hardcoded constants
      const selectedModelId = preferences[modelType];
      const selectedModel = promptModels.find(
        (model) => model.name === selectedModelId,
      );

      return selectedModel;
    },
    [preferences, promptModels, imageModels],
  );

  const filteredModels = useMemo(() => {
    if (!promptModels) return [];
    let filtered = [...promptModels];

    // Filter by price/tier (free/premium)
    if (activeFilters.pricing === "free") {
      filtered = filtered.filter(
        (model) =>
          model.costPerMillionInputTokens === 0 &&
          model.costPerMillionOutputTokens === 0,
      );
    } else if (activeFilters.pricing === "premium") {
      filtered = filtered.filter(
        (model) =>
          model.costPerMillionInputTokens > 0 ||
          model.costPerMillionOutputTokens > 0,
      );
    }

    // Filter by image support
    if (activeFilters.imageSupport) {
      filtered = filtered.filter((model) => model.attachableImageCount > 0);
    }

    // Filter by vendor
    if (activeFilters.vendor) {
      filtered = filtered.filter(
        (model) => model.provider.toLowerCase() === activeFilters.vendor,
      );
    }

    // Filter by speed
    if (activeFilters.speed) {
      const speedMap = {
        slow: [1, 2],
        medium: [3],
        fast: [4],
        insane: [5],
      };

      filtered = filtered.filter((model) => {
        if (!activeFilters.speed) return true;
        return speedMap[activeFilters.speed].includes(model.speedLevel);
      });
    }

    return filtered;
  }, [activeFilters, promptModels]);

  const getModelStats = useCallback((model: LLMModel | ImageModel) => {
    return [
      {
        name: "Speed",
        value: model.speedLevel,
        color: SPEED_COLORS[model.speedLevel],
      },
      {
        name: "Intelligence",
        value: model.intelligenceLevel,
        color: "#4285F4",
      },
      { name: "Creativity", value: model.creativityLevel, color: "#F472B6" },
      { name: "Stamina", value: model.staminaLevel, color: "#8B5CF6" },
    ];
  }, []);

  const getUpgradeMessage = useCallback(
    (cost: number) => {
      if (!user) return { text: "Sign in to access", icon: <FaCrown /> };

      // Arbitrary cost thresholds, adjust as needed
      if (cost > 30) {
        return { text: "Upgrade to Hero", icon: <FaStar /> };
      } else if (cost > 10) {
        return { text: "Upgrade to Strong", icon: <FaCrown /> };
      } else {
        return { text: "Upgrade to Spark", icon: <FaBolt /> };
      }
    },
    [user],
  );

  const isModelAccessible = useCallback(
    (model: LLMModel) => {
      if (
        !model.costPerMillionInputTokens ||
        model.costPerMillionInputTokens === 0
      )
        return true;
      if (!user) return false;

      // Use plan tier to determine accessibility
      // This is a simplified version, you may want to adjust thresholds
      if (model.costPerMillionInputTokens > 30 && user.planTier < 3)
        return false;
      if (model.costPerMillionInputTokens > 10 && user.planTier < 2)
        return false;
      if (model.costPerMillionInputTokens > 0 && user.planTier < 1)
        return false;

      return true;
    },
    [user],
  );

  // Function to format model description with proper capitalization
  const formatDescription = useCallback((text: string): string => {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }, []);

  const renderModelCard = useCallback(
    (model: LLMModel) => {
      if (!preferences) return null;

      const isAccessible = isModelAccessible(model);
      const isExpanded = expandedModelDetails === model.name;
      const modelStats = getModelStats(model);
      const modelCost = model.costPerMillionInputTokens || 0;
      const tierLabel = modelCost > 0 ? "Premium" : "Free";
      const isSelected =
        model.name ===
        preferences[activeSection === "main" ? "mainModel" : "programmerModel"];

      return (
        <div
          key={model.name}
          className={`model-card ${isSelected ? "selected" : ""} ${!isAccessible ? "disabled" : ""}`}
        >
          <div
            className="model-card-header"
            onClick={() => {
              if (isAccessible) {
                handleModelChange(
                  activeSection === "main" ? "mainModel" : "programmerModel",
                  model.name,
                );
              }
            }}
          >
            <div className="model-name-row">
              <span className="model-name">{model.displayName}</span>
              <button
                className="info-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedModelDetails(isExpanded ? null : model.name);
                }}
              >
                <MdInfoOutline />
              </button>
            </div>
            {model.provider && (
              <span
                className="vendor-badge"
                style={{
                  backgroundColor:
                    VENDOR_COLORS[model.provider.toLowerCase() as Vendor] ||
                    "#999",
                }}
              >
                {getVendorIcon(model.provider.toLowerCase() as Vendor)}
              </span>
            )}
          </div>

          <div className="model-badges">
            {/* Model capabilities and stats */}
            <span
              className="badge"
              style={{
                background: SPEED_COLORS[model.speedLevel],
              }}
            >
              {getSpeedIcon(model.speedLevel)}
              Speed:{" "}
              {SPEED_LEVELS[model.speedLevel as keyof typeof SPEED_LEVELS] ||
                `Level ${model.speedLevel}`}
            </span>
            <span
              className="badge"
              style={{
                backgroundColor: modelCost > 0 ? "#5865F2" : "#43B581",
              }}
            >
              {modelCost > 0 ? MemoizedFaCrownPremium : MemoizedFaCrownFree}{" "}
              {tierLabel}
            </span>
            {model.attachableImageCount > 0 && (
              <span
                className="badge"
                style={{
                  backgroundColor: "#43B581",
                }}
              >
                {MemoizedFaImage}{" "}
                {model.attachableImageCount > 1
                  ? `${model.attachableImageCount} Images`
                  : "Image"}
              </span>
            )}
            {model.supportsTools && (
              <span
                className="badge"
                style={{
                  backgroundColor: "#8B5CF6",
                }}
              >
                <FaRobot /> Tools
              </span>
            )}
          </div>

          {isExpanded && (
            <div className="model-details">
              <div className="model-description">
                <p>{formatDescription(model.description)}</p>
              </div>

              <div className="model-character-sheet">
                <div className="stat-bars">
                  {modelStats.map((stat) => (
                    <div key={stat.name} className="stat-bar-container">
                      <div className="stat-label">{stat.name}</div>
                      <div className="stat-bar-background">
                        <div
                          className="stat-bar-fill"
                          style={{
                            width: `${stat.value * 20}%`,
                            background: stat.color,
                          }}
                        ></div>
                      </div>
                      <div className="stat-value">{stat.value}/5</div>
                    </div>
                  ))}
                </div>

                {/* Character sheet details */}
                <div className="character-details">
                  <div className="detail-row">
                    <strong>Class:</strong> <span>{model.characterClass}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Personality:</strong>{" "}
                    <span>{model.personality}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Special Ability:</strong>{" "}
                    <span>{model.specialAbility}</span>
                  </div>

                  <div className="collapsible-details">
                    <div className="detail-row">
                      <strong>Strengths:</strong> <span>{model.strengths}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Weaknesses:</strong>{" "}
                      <span>{model.weaknesses}</span>
                    </div>
                    <div className="detail-row">
                      <strong>Version:</strong> <span>{model.version}</span>
                    </div>
                    {model.costPerMillionInputTokens > 0 && (
                      <div className="pricing-details">
                        <div className="detail-row">
                          <strong>Input Cost:</strong>{" "}
                          <span>
                            ${model.costPerMillionInputTokens.toFixed(3)}/M
                            tokens
                          </span>
                        </div>
                        <div className="detail-row">
                          <strong>Output Cost:</strong>{" "}
                          <span>
                            ${model.costPerMillionOutputTokens.toFixed(3)}/M
                            tokens
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isAccessible && (
            <div onClick={redirectToGeneralTab} className="upgrade-message">
              {getUpgradeMessage(modelCost).icon}
              <span>{getUpgradeMessage(modelCost).text}</span>
            </div>
          )}
        </div>
      );
    },
    [
      preferences,
      isModelAccessible,
      expandedModelDetails,
      getModelStats,
      activeSection,
      getVendorIcon,
      getSpeedIcon,
      MemoizedFaCrownPremium,
      MemoizedFaCrownFree,
      MemoizedFaImage,
      formatDescription,
      getUpgradeMessage,
      handleModelChange,
    ],
  );

  const renderImageModelCard = useCallback(
    (model?: ImageModel) => {
      if (!model) return null;
      if (!preferences) return null;

      // Convert name to a valid Model type for compatibility with preferences
      const modelId = model.name as Model;
      const isAccessible = model.minimumTier
        ? (user?.planTier ?? 0) >= model.minimumTier
        : true;
      const tierLabel = model.minimumTier
        ? `${model.minimumTier === 1 ? "Spark" : "Strong"}`
        : "Free";
      const isSelected = modelId === preferences.imageGeneration.model;
      const isExpanded = expandedModelDetails === model.name;
      const modelStats = getModelStats(model);

      return (
        <div
          key={model.name}
          className={`model-card ${isSelected ? "selected" : ""} ${!isAccessible ? "disabled" : ""}`}
        >
          <div
            className="model-card-header"
            onClick={() => {
              if (isAccessible) {
                handleModelChange("imageGeneration", {
                  model: modelId,
                  size: preferences.imageGeneration.size,
                });
              }
            }}
          >
            <div className="model-name-row">
              <span className="model-name">{model.displayName}</span>
              <button
                className="info-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedModelDetails(isExpanded ? null : model.name);
                }}
              >
                <MdInfoOutline />
              </button>
            </div>
            {model.provider && (
              <span
                className="vendor-badge"
                style={{
                  backgroundColor:
                    VENDOR_COLORS[model.provider.toLowerCase() as Vendor] ||
                    "#999",
                }}
              >
                {getVendorIcon(model.provider.toLowerCase() as Vendor)}
              </span>
            )}
          </div>

          <div className="model-badges">
            <span
              className="badge"
              style={{
                background: SPEED_COLORS[model.speedLevel],
              }}
            >
              {getSpeedIcon(model.speedLevel)}
              Speed:{" "}
              {SPEED_LEVELS[model.speedLevel as keyof typeof SPEED_LEVELS] ||
                `Level ${model.speedLevel}`}
            </span>
            <span
              className="badge"
              style={{
                backgroundColor: model.minimumTier ? "#5865F2" : "#43B581",
              }}
            >
              {model.minimumTier ? MemoizedFaCrownPremium : MemoizedFaCrownFree}{" "}
              {tierLabel}
            </span>
            {model.name.includes("hd") && (
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

          {isExpanded && (
            <div className="model-details">
              <div className="model-description">
                <p>{formatDescription(model.description)}</p>
              </div>

              <div className="model-character-sheet">
                <div className="stat-bars">
                  {modelStats.map((stat) => (
                    <div key={stat.name} className="stat-bar-container">
                      <div className="stat-label">{stat.name}</div>
                      <div className="stat-bar-background">
                        <div
                          className="stat-bar-fill"
                          style={{
                            width: `${stat.value * 20}%`,
                            background: stat.color,
                          }}
                        ></div>
                      </div>
                      <div className="stat-value">{stat.value}/5</div>
                    </div>
                  ))}
                </div>

                <div className="character-details">
                  <div className="detail-row">
                    <strong>Class:</strong> <span>{model.characterClass}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Cost:</strong> <span>${model.cost.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isAccessible && model.minimumTier && (
            <div className="upgrade-message" onClick={redirectToGeneralTab}>
              {getUpgradeMessage(model.minimumTier * 10).icon}
              <span>{getUpgradeMessage(model.minimumTier * 10).text}</span>
            </div>
          )}
          {isExpanded && isAccessible && (
            <div className="dimension-options">
              <h4>Size Options</h4>
              <div className="dimension-buttons">
                {Object.values(IMAGE_GENERATION_SIZES).map((size) => (
                  <button
                    key={size.wh}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModelChange("imageGeneration", {
                        model: modelId,
                        size,
                      });
                    }}
                    className={`dimension-button ${
                      modelId === preferences.imageGeneration.model &&
                      size.wh === preferences.imageGeneration.size.wh
                        ? "selected"
                        : ""
                    }`}
                  >
                    {size.description}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    },
    [
      expandedModelDetails,
      getVendorIcon,
      getSpeedIcon,
      getModelStats,
      formatDescription,
      handleModelChange,
      preferences,
      MemoizedFaCrownFree,
      MemoizedFaCrownPremium,
      user?.planTier,
      getUpgradeMessage,
    ],
  );

  const renderFilterSection = () => {
    return (
      <div className="filter-section">
        {/* Mobile filter toggle */}
        {(isMobile || isCompactView) && (
          <button
            className={`filter-toggle ${isFilterSectionExpanded ? "active" : ""}`}
            onClick={() => setIsFilterSectionExpanded(!isFilterSectionExpanded)}
          >
            <MdFilterAlt />
            Filters
            {isFilterSectionExpanded ? <MdExpandLess /> : <MdExpandMore />}
          </button>
        )}

        {/* Filter controls - conditionally shown on mobile */}
        <div
          className={`filter-controls ${
            isMobile || isCompactView
              ? isFilterSectionExpanded
                ? "expanded"
                : "collapsed"
              : ""
          }`}
        >
          {activeSection === "main" || activeSection === "programmer" ? (
            <Fragment>
              {/* Model tag filter */}
              <div className="tag-filter">
                <div className="filter-group-header">
                  <div className="toggle-switch">
                    <input
                      type="checkbox"
                      id="taggedModelToggle"
                      checked={showTaggedModels}
                      onChange={() => setShowTaggedModels(!showTaggedModels)}
                    />
                    <label htmlFor="taggedModelToggle"></label>
                  </div>
                  <label className="toggle-label" htmlFor="taggedModelToggle">
                    Show tagged models
                  </label>
                </div>
              </div>

              {/* Speed filter */}
              <div className="filter-group">
                <div
                  className="filter-group-header"
                  onClick={() => toggleFilterGroup("speed")}
                >
                  <span>Speed</span>
                  {expandedFilters.speed ? <MdExpandLess /> : <MdExpandMore />}
                </div>
                {expandedFilters.speed && (
                  <div className="filter-options">
                    <button
                      className={`filter-button ${
                        activeFilters.speed === "slow" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("speed", "slow")}
                    >
                      <FaClock /> Slow
                    </button>
                    <button
                      className={`filter-button ${
                        activeFilters.speed === "medium" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("speed", "medium")}
                    >
                      <FaRobot /> Medium
                    </button>
                    <button
                      className={`filter-button ${
                        activeFilters.speed === "fast" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("speed", "fast")}
                    >
                      <FaBolt /> Fast
                    </button>
                    <button
                      className={`filter-button ${
                        activeFilters.speed === "insane" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("speed", "insane")}
                    >
                      <FaFire style={faFireStyle} /> Insane
                    </button>
                  </div>
                )}
              </div>

              {/* Pricing filter */}
              <div className="filter-group">
                <div
                  className="filter-group-header"
                  onClick={() => toggleFilterGroup("pricing")}
                >
                  <span>Pricing</span>
                  {expandedFilters.pricing ? (
                    <MdExpandLess />
                  ) : (
                    <MdExpandMore />
                  )}
                </div>
                {expandedFilters.pricing && (
                  <div className="filter-options">
                    <button
                      className={`filter-button ${
                        activeFilters.pricing === "free" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("pricing", "free")}
                    >
                      {MemoizedFaCrownFree} Free
                    </button>
                    <button
                      className={`filter-button ${
                        activeFilters.pricing === "premium" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("pricing", "premium")}
                    >
                      {MemoizedFaCrownPremium} Premium
                    </button>
                  </div>
                )}
              </div>

              {/* Features filter */}
              <div className="filter-group">
                <div
                  className="filter-group-header"
                  onClick={() => toggleFilterGroup("features")}
                >
                  <span>Features</span>
                  {expandedFilters.features ? (
                    <MdExpandLess />
                  ) : (
                    <MdExpandMore />
                  )}
                </div>
                {expandedFilters.features && (
                  <div className="filter-options">
                    <button
                      className={`filter-button ${
                        activeFilters.imageSupport ? "active" : ""
                      }`}
                      onClick={() =>
                        setActiveFilters((prev) => ({
                          ...prev,
                          imageSupport: !prev.imageSupport,
                        }))
                      }
                    >
                      {MemoizedFaImage} Image Support
                    </button>
                  </div>
                )}
              </div>

              {/* Vendor filter */}
              <div className="filter-group">
                <div
                  className="filter-group-header"
                  onClick={() => toggleFilterGroup("vendor")}
                >
                  <span>Vendor</span>
                  {expandedFilters.vendor ? <MdExpandLess /> : <MdExpandMore />}
                </div>
                {expandedFilters.vendor && (
                  <div className="filter-options">
                    <button
                      className={`filter-button ${
                        activeFilters.vendor === "openai" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("vendor", "openai")}
                      style={{ color: VENDOR_COLORS.openai }}
                    >
                      <SiOpenai /> OpenAI
                    </button>
                    <button
                      className={`filter-button ${
                        activeFilters.vendor === "anthropic" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("vendor", "anthropic")}
                      style={{ color: VENDOR_COLORS.anthropic }}
                    >
                      <FaBrain /> Anthropic
                    </button>
                    <button
                      className={`filter-button ${
                        activeFilters.vendor === "google" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("vendor", "google")}
                      style={{ color: VENDOR_COLORS.google }}
                    >
                      <FaGoogle /> Google
                    </button>
                    <button
                      className={`filter-button ${
                        activeFilters.vendor === "mistral" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("vendor", "mistral")}
                      style={{ color: VENDOR_COLORS.mistral }}
                    >
                      <FaBolt /> Mistral
                    </button>
                    <button
                      className={`filter-button ${
                        activeFilters.vendor === "meta" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("vendor", "meta")}
                      style={{ color: VENDOR_COLORS.meta }}
                    >
                      <TbBrandMeta /> Meta
                    </button>
                    <button
                      className={`filter-button ${
                        activeFilters.vendor === "cerebras" ? "active" : ""
                      }`}
                      onClick={() => toggleFilter("vendor", "cerebras")}
                      style={{ color: VENDOR_COLORS.cerebras }}
                    >
                      <FaMicrochip /> Cerebras
                    </button>
                  </div>
                )}
              </div>
            </Fragment>
          ) : (
            <Fragment>
              {/* Image model filters */}
              <div className="filter-group">
                <div
                  className="filter-group-header"
                  onClick={() => toggleFilterGroup("provider")}
                >
                  <span>Provider</span>
                  {expandedFilters.provider ? (
                    <MdExpandLess />
                  ) : (
                    <MdExpandMore />
                  )}
                </div>
                {expandedFilters.provider && (
                  <div className="filter-options">
                    <button
                      className={`filter-button ${
                        imageFilters.provider === "openai" ? "active" : ""
                      }`}
                      onClick={() =>
                        setImageFilters((prev) => ({
                          ...prev,
                          provider:
                            prev.provider === "openai" ? null : "openai",
                        }))
                      }
                    >
                      <SiOpenai /> OpenAI
                    </button>
                  </div>
                )}
              </div>

              <div className="filter-group">
                <div
                  className="filter-group-header"
                  onClick={() => toggleFilterGroup("dimensions")}
                >
                  <span>Dimensions</span>
                  {expandedFilters.dimensions ? (
                    <MdExpandLess />
                  ) : (
                    <MdExpandMore />
                  )}
                </div>
                {expandedFilters.dimensions && (
                  <div className="filter-options">
                    <button
                      className={`filter-button ${
                        imageFilters.dimensions === "square" ? "active" : ""
                      }`}
                      onClick={() =>
                        setImageFilters((prev) => ({
                          ...prev,
                          dimensions:
                            prev.dimensions === "square" ? null : "square",
                        }))
                      }
                    >
                      □ Square
                    </button>
                    <button
                      className={`filter-button ${
                        imageFilters.dimensions === "landscape" ? "active" : ""
                      }`}
                      onClick={() =>
                        setImageFilters((prev) => ({
                          ...prev,
                          dimensions:
                            prev.dimensions === "landscape"
                              ? null
                              : "landscape",
                        }))
                      }
                    >
                      ▭ Landscape
                    </button>
                    <button
                      className={`filter-button ${
                        imageFilters.dimensions === "portrait" ? "active" : ""
                      }`}
                      onClick={() =>
                        setImageFilters((prev) => ({
                          ...prev,
                          dimensions:
                            prev.dimensions === "portrait" ? null : "portrait",
                        }))
                      }
                    >
                      ▯ Portrait
                    </button>
                  </div>
                )}
              </div>

              <div className="filter-group">
                <div
                  className="filter-group-header"
                  onClick={() => toggleFilterGroup("quality")}
                >
                  <span>Quality</span>
                  {expandedFilters.quality ? (
                    <MdExpandLess />
                  ) : (
                    <MdExpandMore />
                  )}
                </div>
                {expandedFilters.quality && (
                  <div className="filter-options">
                    <button
                      className={`filter-button ${
                        imageFilters.quality === "low" ? "active" : ""
                      }`}
                      onClick={() =>
                        setImageFilters((prev) => ({
                          ...prev,
                          quality: prev.quality === "low" ? null : "low",
                        }))
                      }
                    >
                      Standard
                    </button>
                    <button
                      className={`filter-button ${
                        imageFilters.quality === "hd" ? "active" : ""
                      }`}
                      onClick={() =>
                        setImageFilters((prev) => ({
                          ...prev,
                          quality: prev.quality === "hd" ? null : "hd",
                        }))
                      }
                    >
                      HD
                    </button>
                  </div>
                )}
              </div>
            </Fragment>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="model-preferences-modal">
      <div className="model-preferences-header">
        <div className="section-tabs">
          <button
            className={`section-tab ${activeSection === "main" ? "active" : ""}`}
            onClick={() => {
              setActiveSection("main");
              setIsFilterSectionExpanded(false);
            }}
          >
            <FaRobot /> Main
          </button>
          <button
            className={`section-tab ${
              activeSection === "programmer" ? "active" : ""
            }`}
            onClick={() => {
              setActiveSection("programmer");
              setIsFilterSectionExpanded(false);
            }}
          >
            <FaMicrochip /> Programmer
          </button>
          <button
            className={`section-tab ${
              activeSection === "image" ? "active" : ""
            }`}
            onClick={() => {
              setActiveSection("image");
              setIsFilterSectionExpanded(false);
            }}
          >
            <FaImage /> Image Gen
          </button>
        </div>
      </div>

      <div className="model-preferences-content">
        {renderFilterSection()}

        <div className="model-selection">
          <div className="current-selection">
            <h3>Selected Model</h3>
            {activeSection === "main" || activeSection === "programmer" ? (
              <div className="selected-model-display">
                <div className="model-name">
                  {getSelectedModelDetails(
                    activeSection === "main" ? "mainModel" : "programmerModel",
                  )?.name || "No model selected"}
                </div>
              </div>
            ) : (
              <div className="selected-model-display">
                <div className="model-name">
                  {getSelectedModelDetails("imageGeneration")?.displayName ||
                    "No model selected"}
                </div>
                <div className="selected-size">
                  {preferences?.imageGeneration?.size?.description || ""}
                </div>
              </div>
            )}
          </div>

          <div className="model-list">
            {isLoadingModels || isLoadingImageModels ? (
              <div className="loading-indicator">Loading models...</div>
            ) : (
              <>
                {activeSection === "main" || activeSection === "programmer" ? (
                  filteredModels.length > 0 ? (
                    filteredModels.map((model) => renderModelCard(model))
                  ) : (
                    <div className="no-models-message">
                      No models match your filter criteria
                    </div>
                  )
                ) : (
                  imageModels?.map((model) => renderImageModelCard(model))
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelPreferencesModal;
