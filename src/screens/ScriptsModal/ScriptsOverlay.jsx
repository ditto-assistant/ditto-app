import React, { useState, useEffect, useRef } from "react";
import { MdAdd, MdSort } from "react-icons/md";
import { FaTrash, FaUndo, FaCog } from "react-icons/fa";
// import { downloadOpenscadScript } from "../control/agentTools";
import { motion, AnimatePresence } from "framer-motion";
import "./ScriptsOverlay.css";
import CardMenu from "@/components/ui/CardMenu";
import SearchBar from "./SearchBar";
import AddScriptOverlay from "./AddScriptOverlay";
import OpenSCADViewer from "./OpenSCADViewer";
import { useScripts } from "@/hooks/useScripts.tsx";
import { useModal } from "@/hooks/useModal";
import VersionsOverlay from "./VersionsOverlay";
import Modal from "@/components/ui/modals/Modal";
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog";

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "";
  const now = new Date();
  const date = new Date(timestamp.seconds * 1000);
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  // If more than 24 hours, show the date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export default function ScriptsOverlay() {
  const { createCloseHandler, createOpenHandler } = useModal();
  const { showConfirmationDialog } = useConfirmationDialog();
  const closeOverlay = createCloseHandler("scripts");

  // Use the scripts context hook instead of useScriptsManager
  const {
    scripts,
    webAppsTimestamps,
    openSCADTimestamps,
    selectedScript,
    setSelectedScript,
    handleDeselectScript,
    saveScript,
    deleteScript,
    renameScript,
    revertScript,
    refreshScripts,
  } = useScripts();

  const [activeTab, setActiveTab] = useState("webApps");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("recent");
  const [showAddForm, setShowAddForm] = useState({
    webApps: false,
    openSCAD: false,
  });
  const [activeCard, setActiveCard] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [renameScriptId, setRenameScriptId] = useState(null);
  const [versionOverlay, setVersionOverlay] = useState(null);
  const [openScadViewer, setOpenScadViewer] = useState(null);
  const cardRefs = useRef({});

  const getBaseName = (name) => {
    const match = name.match(/^[^\-]+/);
    return match ? match[0].replace(/([a-z])([A-Z])/g, "$1 $2").trim() : name;
  };

  const getLocalTimestamps = (category) => {
    return category === "webApps" ? webAppsTimestamps : openSCADTimestamps;
  };

  const getBaseNameAndVersion = (name) => {
    const versionMatch = name.match(/-v(\d+)$/);
    const version = versionMatch ? versionMatch[1] : null;
    const baseName = name.replace(/-v\d+$/, "");
    return { baseName, version };
  };

  // MARK: -  Event Handlers
  const handleSelectScript = (script) => {
    // Update to pass the full script object with correct property names
    setSelectedScript({
      name: script.name,
      content: script.content,
      scriptType: script.scriptType,
    });

    // Trigger a global event to notify other components
    window.dispatchEvent(new Event("scriptSelected"));
  };

  const openDeleteConfirmation = (script, category) => {
    const content = `Are you sure you want to delete "${script?.name}"? This action cannot be undone.`;
    showConfirmationDialog({
      title: "Confirm Delete",
      content,
      confirmLabel: "Delete",
      variant: "danger",
      onConfirm: () => handleDeleteScript(category, script),
    });
  };

  const openRevertConfirmation = (script, category, version) => {
    showConfirmationDialog({
      title: "Confirm Revert",
      content: (
        <span>
          Are you sure you want to revert to &quot;
          {script?.name}&quot;
          <span
            style={{
              backgroundColor: "#5865F2",
              color: "#FFFFFF",
              borderRadius: "4px",
              padding: "2px 6px",
              fontSize: "12px",
              display: "inline-block",
              margin: "0 4px",
            }}
          >
            v{version}
          </span>
          ?
        </span>
      ),
      confirmLabel: "Revert",
      variant: "primary",
      onConfirm: () => handleRevertScript(category, script),
    });
  };

  const handleDeleteScript = async (category, currentScript) => {
    const baseScriptName = getBaseNameAndVersion(currentScript.name).baseName;

    try {
      const relatedScripts = scripts[category].filter(
        (script) =>
          getBaseNameAndVersion(script.name).baseName === baseScriptName,
      );

      for (const script of relatedScripts) {
        await deleteScript(category, script.name);
      }

      // Close version overlay since all versions are deleted
      setVersionOverlay(null);
    } catch (error) {
      console.error("Error deleting script:", error);
    }
  };

  const handleSelectVersion = (script) => {
    // Update selected script
    setSelectedScript(script);

    // Close overlays
    setVersionOverlay(null);
    setActiveCard(null);
    setMenuPosition(null);
  };

  const handleEditScript = (script) => {
    if (script.scriptType === "webApps") {
      closeOverlay();
      window.dispatchEvent(
        new CustomEvent("editScript", {
          detail: { script },
        }),
      );
    } else if (script.scriptType === "openSCAD") {
      setOpenScadViewer(script);
    }
  };

  const handleAddScriptClick = (category) => {
    setShowAddForm((prev) => ({ ...prev, [category]: true }));
  };

  const handleSaveScript = async (category, name, content) => {
    console.log("Attempting to save script:", { category, name, content });
    if (!name || !content) {
      console.error("Script name or content is missing:", { name, content });
      return;
    }

    try {
      await saveScript(content, category, name);
      setShowAddForm((prev) => ({ ...prev, [category]: false }));
    } catch (error) {
      console.error("Error saving script:", error);
    }
  };

  const openDittoCanvas = createOpenHandler("dittoCanvas");
  const handlePlayScript = (script) => {
    if (script.scriptType === "webApps") {
      setSelectedScript(script);
      openDittoCanvas();
    } else {
      // Handle OpenSCAD scripts (download)
      const blob = new Blob([script.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${script.name}.scad`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      closeOverlay();
    }
  };

  const handleDownloadScript = (script) => {
    const blob = new Blob([script.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      script.scriptType === "webApps"
        ? `${script.name}.html`
        : `${script.name}.scad`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRenameScript = async (scriptId, newName) => {
    const category = activeTab;
    const script = scripts[category].find((s) => s.id === scriptId);

    if (script) {
      try {
        const timestamps = getLocalTimestamps(category);
        const timestampString = timestamps[script.name]?.timestampString;
        await renameScript(timestampString, category, script.name, newName);
      } catch (error) {
        console.error("Error renaming script:", error);
      }
    }

    setRenameScriptId(null);
  };

  const handleRevertScript = async (category, currentScript) => {
    try {
      // Delete the current version (which will become the new version)
      await revertScript(category, currentScript.name);
    } catch (error) {
      console.error("Error reverting script:", error);
    }
  };

  // Close overlays when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuPosition &&
        !event.target.closest(".card-menu") &&
        !event.target.closest(".more-icon")
      ) {
        setActiveCard(null);
        setMenuPosition(null);
      }
      if (versionOverlay && !event.target.closest(".card-menu")) {
        setVersionOverlay(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuPosition, versionOverlay]);

  // Sort and filter functions
  const sortScripts = (scripts) => {
    // First, group scripts by their base name (without version numbers)
    const groupedScripts = {};
    scripts.forEach((script) => {
      const baseName = getBaseName(script.name.replace(/ /g, ""));
      if (!groupedScripts[baseName]) {
        groupedScripts[baseName] = [];
      }
      groupedScripts[baseName].push(script);
    });
    // Get the main version of each script group (the one without -v suffix)
    const mainVersions = Object.values(groupedScripts).map((group) => {
      return group.find((script) => !script.name.includes("-v")) || group[0];
    });

    if (sortOrder === "alphabetical") {
      return mainVersions.sort((a, b) => {
        const nameA = getBaseName(a.name).toLowerCase();
        const nameB = getBaseName(b.name).toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else {
      // Sort by most recent first using the timestamp
      return mainVersions.sort((a, b) => {
        const timestampsA = getLocalTimestamps(a.scriptType)[a.name];
        const timestampsB = getLocalTimestamps(b.scriptType)[b.name];
        if (!timestampsA || !timestampsB) return 0;
        const timeA = timestampsA.timestamp?.seconds * 1000 || 0;
        const timeB = timestampsB.timestamp?.seconds * 1000 || 0;
        return timeB - timeA;
      });
    }
  };

  const filterScripts = (scripts, searchTerm) => {
    let filteredScripts = scripts || [];
    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      filteredScripts = filteredScripts.filter((script) => {
        const baseName = getBaseName(
          script.name.replace(/ /g, ""),
        ).toLowerCase();
        return baseName.includes(normalizedSearch);
      });
    }
    return sortScripts(filteredScripts);
  };

  const getScriptsByBaseName = (scripts) => {
    const grouped = {};
    scripts.forEach((script) => {
      const baseName = getBaseName(script.name.replace(/ /g, ""));
      if (!grouped[baseName]) grouped[baseName] = [];
      grouped[baseName].push(script);
    });

    // Sort versions with the selected version at the top, followed by latest (no -v tag),
    // then other versions in descending order
    Object.keys(grouped).forEach((baseName) => {
      grouped[baseName].sort((a, b) => {
        // If one is selected, it should be first
        if (a.name === selectedScript?.script) return -1;
        if (b.name === selectedScript?.script) return 1;
        // Then check for version numbers
        const aMatch = a.name.match(/v(\d+)/);
        const bMatch = b.name.match(/v(\d+)/);
        // If neither has a version, maintain current order
        if (!aMatch && !bMatch) return 0;
        // If only one has a version, the one without version (latest) should be first
        if (!aMatch) return -1;
        if (!bMatch) return 1;
        // Otherwise sort by version number in descending order
        return parseInt(bMatch[1]) - parseInt(aMatch[1]);
      });
    });

    return grouped;
  };

  const renderScripts = (category) => {
    const scriptsForCategory = scripts[category] || [];
    const filteredScripts = filterScripts(scriptsForCategory, searchTerm);
    const groupedScripts = getScriptsByBaseName(filteredScripts);

    if (Object.keys(groupedScripts).length === 0) {
      if (searchTerm) {
        return (
          <div className="no-results">
            No scripts found matching &quot;{searchTerm}&quot;
          </div>
        );
      } else {
        return (
          <div className="no-results">
            <div className="no-results-text">
              No scripts found.
              <br />
              Click + to add one or ask Ditto to make you an app.
            </div>
          </div>
        );
      }
    }

    return Object.keys(groupedScripts).map((baseName) => {
      const scriptsList = groupedScripts[baseName];
      const currentScript =
        scriptsList.find((s) => s.name === selectedScript?.script) ||
        scriptsList.find((s) => !s.name.includes("-v")) ||
        scriptsList[0];
      // Check for multiple versions by looking at the base name
      const hasMultipleVersions =
        scriptsForCategory.filter(
          (script) => getBaseName(script.name.replace(/ /g, "")) === baseName,
        ).length > 1;

      if (!cardRefs.current[currentScript.id]) {
        cardRefs.current[currentScript.id] = React.createRef();
      }

      const { baseName: scriptBaseName, version } = getBaseNameAndVersion(
        currentScript.name,
      );

      return (
        <motion.div
          ref={cardRefs.current[currentScript.id]}
          key={currentScript.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{
            y: -4,
            boxShadow: "0 8px 16px rgba(0, 0, 0, 0.2)",
          }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            handleSelectScript(currentScript);
            if (category === "webApps") {
              handlePlayScript(currentScript);
            } else {
              handleDownloadScript(currentScript);
            }
          }}
          className={`script-card ${
            selectedScript?.script === currentScript.name ? "selected" : ""
          }`}
        >
          <div className="script-card-header">
            {renameScriptId === currentScript.id ? (
              <input
                type="text"
                defaultValue={scriptBaseName}
                onBlur={(e) =>
                  handleRenameScript(currentScript.id, e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameScript(currentScript.id, e.target.value);
                  } else if (e.key === "Escape") {
                    setRenameScriptId(null);
                  }
                }}
                className="rename-input"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p className="script-name">
                {scriptBaseName}
                {version && <span className="version-badge">v{version}</span>}
              </p>
            )}
          </div>

          <div className="timestamp-container">
            <span className="timestamp">
              {formatTimestamp(
                getLocalTimestamps(category)[currentScript.name]?.timestamp,
              )}
            </span>
          </div>

          <div className="actions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="edit-button"
              onClick={(e) => {
                e.stopPropagation();
                handleEditScript(currentScript);
              }}
            >
              Edit
            </motion.button>
            <FaCog
              className="more-icon"
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuPosition({
                  top: rect.bottom + 8,
                  left: rect.left,
                });
                setActiveCard(currentScript.id);
              }}
            />
          </div>

          {activeCard === currentScript.id && menuPosition && (
            <CardMenu
              className="card-menu"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
                transformOrigin: menuPosition.openUpward ? "bottom" : "top",
              }}
            >
              <motion.div
                className="card-menu-item"
                whileHover={{ backgroundColor: "rgba(88, 101, 242, 0.1)" }}
                onClick={(e) => {
                  if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                  setRenameScriptId(currentScript.id);
                  setActiveCard(null);
                  setMenuPosition(null);
                }}
              >
                Rename
              </motion.div>
              <motion.div
                className="card-menu-item"
                whileHover={{ backgroundColor: "rgba(88, 101, 242, 0.1)" }}
                onClick={(e) => {
                  if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                  handleDownloadScript(currentScript);
                  setActiveCard(null);
                  setMenuPosition(null);
                }}
              >
                Download
              </motion.div>
              {hasMultipleVersions && (
                <motion.div
                  className="card-menu-item"
                  whileHover={{
                    backgroundColor: "rgba(88, 101, 242, 0.1)",
                  }}
                  onClick={(e) => {
                    if (e) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                    const versions = scripts[activeTab].filter(
                      (script) =>
                        getBaseName(script.name.replace(/ /g, "")) === baseName,
                    );
                    setVersionOverlay({
                      baseScriptName: baseName,
                      versions: versions,
                    });
                    setActiveCard(null);
                    setMenuPosition(null);
                  }}
                >
                  Version
                </motion.div>
              )}
              {hasMultipleVersions && (
                <>
                  <div className="menu-divider" />
                  <motion.div
                    className="card-menu-item primary"
                    whileHover={{
                      backgroundColor: "rgba(88, 101, 242, 0.1)",
                    }}
                    onClick={(e) => {
                      if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                      openRevertConfirmation(currentScript, category, version);
                      setActiveCard(null);
                      setMenuPosition(null);
                    }}
                  >
                    <FaUndo style={{ marginRight: "8px" }} />
                    Revert
                  </motion.div>
                </>
              )}
              <motion.div
                className="card-menu-item danger"
                whileHover={{ backgroundColor: "rgba(218, 55, 60, 0.1)" }}
                onClick={(e) => {
                  if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                  openDeleteConfirmation(currentScript, category);
                  setActiveCard(null);
                  setMenuPosition(null);
                }}
              >
                <FaTrash style={{ marginRight: "8px" }} />
                Delete
              </motion.div>
            </CardMenu>
          )}
        </motion.div>
      );
    });
  };

  // SortButton component
  const SortButton = () => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="sort-button"
      onClick={() => {
        setSortOrder((prev) => {
          const newOrder = prev === "recent" ? "alphabetical" : "recent";
          return newOrder;
        });
      }}
    >
      <MdSort className="sort-icon" />
      <span className="sort-text">
        {sortOrder === "recent" ? "Most Recent" : "Alphabetical"}
      </span>
    </motion.div>
  );

  const modalContent = (
    <>
      {selectedScript && (
        <motion.div
          className="selected-script-container"
          initial={{ opacity: 0, height: 0, y: -20 }}
          animate={{
            opacity: 1,
            height: "auto",
            y: 0,
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 25,
              mass: 0.5,
            },
          }}
          exit={{
            opacity: 0,
            height: 0,
            y: -20,
            transition: {
              type: "spring",
              stiffness: 300,
              damping: 25,
              mass: 0.5,
              opacity: { duration: 0.2 },
            },
          }}
        >
          <motion.div
            className="selected-script"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              transition: {
                delay: 0.1,
                type: "spring",
                stiffness: 400,
                damping: 25,
                mass: 0.5,
              },
            }}
            exit={{
              scale: 0.95,
              opacity: 0,
              transition: {
                duration: 0.2,
              },
            }}
          >
            <motion.div
              className="selected-script-header"
              initial={{ opacity: 0, y: -10 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: {
                  delay: 0.2,
                  duration: 0.3,
                },
              }}
            >
              <p className="selected-script-label">Currently Selected</p>
              <div className="selected-script-actions">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="edit-selected-button"
                  onClick={() => {
                    const script = scripts[activeTab]?.find(
                      (s) => s.name === selectedScript.script,
                    );
                    if (script) handleEditScript(script);
                  }}
                >
                  Edit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="deselect-button"
                  onClick={handleDeselectScript}
                >
                  Deselect
                </motion.button>
              </div>
            </motion.div>
            <motion.h2
              className="selected-script-name"
              initial={{ opacity: 0, x: -20 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: {
                  delay: 0.3,
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                },
              }}
            >
              {selectedScript.script}
            </motion.h2>
          </motion.div>
        </motion.div>
      )}

      <div className="modal-body">
        <div className="fixed-header">
          <div className="tab-container">
            <div
              className={`tab ${activeTab === "webApps" ? "active" : ""}`}
              onClick={() => {
                refreshScripts();
                setActiveTab("webApps");
              }}
            >
              Web Apps
            </div>
            <div
              className={`tab ${activeTab === "openSCAD" ? "active" : ""}`}
              onClick={() => {
                refreshScripts();
                setActiveTab("openSCAD");
              }}
            >
              Open SCAD
            </div>
          </div>

          <div className="search-sort-container">
            <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            <SortButton />
          </div>
        </div>

        <div className="scrollable-content">
          {activeTab === "webApps" && (
            <>
              <div className="add-script-container">
                <div
                  className="add-script-button"
                  onClick={() => handleAddScriptClick("webApps")}
                >
                  <MdAdd style={{ fontSize: "24px", color: "#7289da" }} />
                </div>
              </div>
              <div className="scripts-grid">{renderScripts("webApps")}</div>
            </>
          )}

          {activeTab === "openSCAD" && (
            <>
              <div className="add-script-container">
                <div
                  className="add-script-button"
                  onClick={() => handleAddScriptClick("openSCAD")}
                >
                  <MdAdd style={{ fontSize: "24px", color: "#7289da" }} />
                </div>
              </div>
              <div className="scripts-grid">{renderScripts("openSCAD")}</div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAddForm[activeTab] && (
          <AddScriptOverlay
            isOpen={showAddForm[activeTab]}
            onClose={() =>
              setShowAddForm((prev) => ({ ...prev, [activeTab]: false }))
            }
            onSave={() => {
              const nameInput = document.getElementById(
                `${activeTab}-name-input`,
              ).value;
              const contentInput = document.getElementById(
                `${activeTab}-content-input`,
              ).value;
              handleSaveScript(activeTab, nameInput, contentInput);
            }}
            category={activeTab}
          />
        )}
      </AnimatePresence>

      {openScadViewer && (
        <OpenSCADViewer
          script={openScadViewer}
          onClose={() => setOpenScadViewer(null)}
        />
      )}

      {versionOverlay && (
        <VersionsOverlay
          isOpen={!!versionOverlay}
          onClose={() => setVersionOverlay(null)}
          onSelect={handleSelectVersion}
          onDelete={handleDeleteScript}
          versions={versionOverlay.versions}
          category={activeTab}
        />
      )}
    </>
  );

  return (
    <Modal id="scripts" title="Scripts" fullScreen>
      {modalContent}
    </Modal>
  );
}
