import React, { useState, useEffect, useRef } from "react";
import { MdClose, MdAdd, MdSort } from "react-icons/md";
import { FaPlay, FaTrash, FaDownload, FaUndo, FaCog } from "react-icons/fa";
import {
  deleteScriptFromFirestore,
  saveScriptToFirestore,
  renameScriptInFirestore,
  getLocalScriptTimestamps,
  getScriptTimestamps,
  syncLocalScriptsWithFirestore,
  getVersionsOfScriptFromFirestore,
} from "../control/firebase";
import { downloadOpenscadScript } from "../control/agentTools";
import { motion, AnimatePresence } from "framer-motion";
import './ScriptsOverlay.css';

// Import all the components you need from ScriptsScreen
import FullScreenEditor from "./FullScreenEditor";
import CardMenu from "./CardMenu";
import VersionOverlay from "./VersionOverlay";
import DeleteConfirmationOverlay from "./DeleteConfirmationOverlay";
import SearchBar from "./SearchBar";
import AddScriptOverlay from "./AddScriptOverlay";
import OpenSCADViewer from "./OpenSCADViewer";
import RevertConfirmationOverlay from "./RevertConfirmationOverlay";
import ScriptActionsOverlay from "./ScriptActionsOverlay";

// Add import
import { useScripts } from '../hooks/useScripts';

const darkModeColors = {
  background: "#1E1F22",
  foreground: "#2B2D31",
  primary: "#5865F2",
  secondary: "#4752C4",
  text: "#FFFFFF",
  textSecondary: "#B5BAC1",
  border: "#1E1F22",
  danger: "#DA373C",
  cardBackground: "#313338",
  headerBackground: "#2B2D31",
  inputBackground: "#1E1F22",
};

const ScriptsOverlay = ({ closeOverlay }) => {
  // Replace the scripts state with the hook
  const { scripts, setScripts, refreshScripts } = useScripts();
  
  // Add effect to refresh scripts when overlay opens
  useEffect(() => {
    refreshScripts();
  }, []); // Run once when overlay opens

  const [activeTab, setActiveTab] = useState("webApps");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("recent");
  // ... copy other state variables

  // Copy all the helper functions from ScriptsScreen
  const sortScripts = (scripts) => {
    if (sortOrder === "alphabetical") {
      return [...scripts].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      return [...scripts].sort((a, b) => {
        const timestampsA = getLocalScriptTimestamps(a.scriptType)[a.name];
        const timestampsB = getLocalScriptTimestamps(b.scriptType)[b.name];
        if (!timestampsA || !timestampsB) return 0;
        const timeA = timestampsA.timestamp.seconds * 1000;
        const timeB = timestampsB.timestamp.seconds * 1000;
        return timeB - timeA;
      });
    }
  };

  // ... copy other helper functions

  // Add these additional states
  const [activeCard, setActiveCard] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [selectedScript, setSelectedScript] = useState(null);
  const [renameScriptId, setRenameScriptId] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    script: null,
    category: null,
  });
  const [versionOverlay, setVersionOverlay] = useState(null);
  const [fullScreenEdit, setFullScreenEdit] = useState(null);
  const [openScadViewer, setOpenScadViewer] = useState(null);
  const cardRefs = useRef({});

  // Add these state variables at the top with the others:
  const [showAddForm, setShowAddForm] = useState({
    webApps: false,
    openSCAD: false,
  });
  const [revertConfirmation, setRevertConfirmation] = useState({
    show: false,
    script: null,
    category: null,
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Add this state for the selected script overlay
  const [showScriptActions, setShowScriptActions] = useState(false);
  const [currentVersion, setCurrentVersion] = useState({});
  const [scriptVersions, setScriptVersions] = useState([]);

  // Add this effect to load script versions when selected script changes
  useEffect(() => {
    const loadScriptVersions = async () => {
      if (selectedScript) {
        const storedScript = JSON.parse(
          localStorage.getItem("workingOnScript")
        );
        if (storedScript) {
          const userID = localStorage.getItem("userID");
          const versions = await getVersionsOfScriptFromFirestore(
            userID,
            storedScript.scriptType,
            storedScript.script
          );
          setScriptVersions(versions);
        }
      }
    };

    loadScriptVersions();
  }, [selectedScript]);

  // Add this effect to update parent component when script is selected
  useEffect(() => {
    if (selectedScript) {
      window.dispatchEvent(new Event("scriptsUpdated"));
    }
  }, [selectedScript]);

  // Add these handlers:
  const handleSelectScript = (script) => {
    localStorage.setItem(
      "workingOnScript",
      JSON.stringify({
        script: script.name,
        contents: script.content,
        scriptType: script.scriptType,
      })
    );
    setSelectedScript(script.name);
  };

  const handleDeleteScript = async (category, currentScript) => {
    setDeleteConfirmation({ show: false, script: null, category: null });

    const userID = localStorage.getItem("userID");
    const baseScriptName = getBaseNameAndVersion(currentScript.name).baseName;

    // Find all versions of this script
    const relatedScripts = scripts[category].filter(
      (script) => getBaseNameAndVersion(script.name).baseName === baseScriptName
    );

    // Delete all versions from Firestore
    for (const script of relatedScripts) {
      await deleteScriptFromFirestore(userID, category, script.name);
    }

    // Update local state
    setScripts((prevState) => ({
      ...prevState,
      [category]: prevState[category].filter(
        (script) => getBaseNameAndVersion(script.name).baseName !== baseScriptName
      ),
    }));

    // If any version was selected, clear selection
    if (relatedScripts.some((script) => script.name === selectedScript)) {
      localStorage.removeItem("workingOnScript");
      setSelectedScript(null);
    }

    setActiveCard(null);
  };

  const handleVersionButtonClick = (baseName) => {
    setVersionOverlay(baseName);
  };

  const handleSelectVersion = (versionedScript) => {
    handleSelectScript(versionedScript);
    setVersionOverlay(null);
  };

  // Add the renderScripts function
  const renderScripts = (category) => {
    const filteredScripts = filterScripts(scripts[category], searchTerm);
    const groupedScripts = getScriptsByBaseName(filteredScripts);

    if (Object.keys(groupedScripts).length === 0) {
      if (searchTerm) {
        return (
          <div style={styles.noResults}>
            No scripts found matching "{searchTerm}"
          </div>
        );
      } else {
        return (
          <div style={styles.noResults}>
            <div style={styles.noResultsText}>
              No scripts found.
              <br />
              Click + to add one or ask Ditto to make you an app.
            </div>
          </div>
        );
      }
    }

    return (
      <div style={styles.scriptsGrid}>
        {Object.keys(groupedScripts).map((baseName) => {
          const scriptsList = groupedScripts[baseName];
          const currentScript = scriptsList[0];
          const hasMultipleVersions = scriptsList.length > 1;

          if (!cardRefs.current[currentScript.id]) {
            cardRefs.current[currentScript.id] = React.createRef();
          }

          const { baseName: scriptBaseName, version } = getBaseNameAndVersion(
            currentScript.name
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
                borderColor: darkModeColors.primary,
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                category === "webApps"
                  ? handlePlayScript(currentScript)
                  : handleDownloadScript(currentScript)
              }
              style={{
                ...styles.scriptCard,
                borderColor:
                  selectedScript === currentScript.name
                    ? darkModeColors.primary
                    : darkModeColors.border,
              }}
            >
              <div style={styles.scriptCardHeader}>
                {renameScriptId === currentScript.id ? (
                  <input
                    type="text"
                    defaultValue={currentScript.name}
                    onBlur={async (e) =>
                      await handleRenameScript(
                        category,
                        currentScript.id,
                        e.target.value
                      )
                    }
                    style={styles.renameInput}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p style={styles.scriptName}>
                    {scriptBaseName}
                    {version && (
                      <span style={styles.versionBadge}>v{version}</span>
                    )}
                  </p>
                )}
                <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={styles.editButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditScript(currentScript);
                    }}
                  >
                    Edit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={styles.selectButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectScript(currentScript);
                    }}
                  >
                    Select
                  </motion.button>
                  <FaCog
                    className="more-icon"
                    style={styles.moreIcon}
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
              </div>
              {/* Add timestamp container */}
              <div style={styles.timestampContainer}>
                <span style={styles.timestamp}>
                  {(() => {
                    const timestamps = getLocalScriptTimestamps(category)[currentScript.name];
                    if (!timestamps) return "";
                    const date = new Date(timestamps.timestamp.seconds * 1000);
                    return date.toLocaleString();
                  })()}
                </span>
              </div>
              {/* Add version overlay and menu components */}
              {activeCard === currentScript.id && menuPosition && (
                <CardMenu
                  style={{
                    top: menuPosition.top,
                    left: menuPosition.left,
                  }}
                >
                  <p
                    style={styles.cardMenuItem}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setRenameScriptId(currentScript.id);
                      setActiveCard(null);
                      setMenuPosition(null);
                    }}
                  >
                    Rename
                  </p>
                  <p
                    style={styles.cardMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadScript(currentScript);
                      setActiveCard(null);
                      setMenuPosition(null);
                    }}
                  >
                    Download
                  </p>
                  {hasMultipleVersions && (
                    <p
                      style={styles.cardMenuItem}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVersionButtonClick(baseName);
                        setActiveCard(null);
                        setMenuPosition(null);
                      }}
                    >
                      Version
                    </p>
                  )}
                  <div style={styles.menuDivider} />
                  <p
                    style={{
                      ...styles.cardMenuItem,
                      color: darkModeColors.danger,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmation({
                        show: true,
                        script: currentScript,
                        category: category,
                        isDeleteAll: true,
                      });
                      setActiveCard(null);
                      setMenuPosition(null);
                    }}
                  >
                    <FaTrash style={{ marginRight: "8px" }} />
                    Delete
                  </p>
                  {hasMultipleVersions && (
                    <p
                      style={{
                        ...styles.cardMenuItem,
                        color: darkModeColors.primary,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRevertConfirmation({
                          show: true,
                          script: currentScript,
                          category: category,
                        });
                        setActiveCard(null);
                        setMenuPosition(null);
                      }}
                    >
                      <FaUndo style={{ marginRight: "8px" }} />
                      Revert
                    </p>
                  )}
                </CardMenu>
              )}
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Add these helper functions after the existing ones:

  const filterScripts = (scripts, searchTerm) => {
    if (!searchTerm) return scripts;
    const normalizedSearch = searchTerm.toLowerCase();
    return scripts.filter((script) => {
      const baseName = getBaseName(script.name.replace(/ /g, "")).toLowerCase();
      return baseName.includes(normalizedSearch);
    });
  };

  const getBaseName = (name) => {
    const match = name.match(/^[^\-]+/);
    let res = match ? match[0].replace(/([a-z])([A-Z])/g, "$1 $2").trim() : name;
    return res;
  };

  const getBaseNameAndVersion = (name) => {
    const versionMatch = name.match(/-v(\d+)$/);
    const version = versionMatch ? versionMatch[1] : null;
    const baseName = name.replace(/-v\d+$/, "");
    return { baseName, version };
  };

  const getScriptsByBaseName = (scripts) => {
    const grouped = {};
    scripts.forEach((script) => {
      const baseName = getBaseName(script.name.replace(/ /g, ""));
      if (!grouped[baseName]) grouped[baseName] = [];
      grouped[baseName].push(script);
    });
    return grouped;
  };

  const handleEditScript = (script) => {
    if (script.scriptType === "webApps") {
      closeOverlay();
      window.dispatchEvent(new CustomEvent('editScript', { 
        detail: { script }
      }));
    } else {
      setOpenScadViewer(script);
    }
  };

  const handleAddScriptClick = (category) => {
    setShowAddForm((prev) => ({ ...prev, [category]: true }));
  };

  const handleSaveScript = async (category, name, content) => {
    console.log("Saving script:", { category, name, content }); // Debug log
    
    if (!name || !content) {
      console.error("Script name or content is missing:", { name, content });
      return;
    }

    const userID = localStorage.getItem("userID");
    try {
      // Save the script to Firestore
      await saveScriptToFirestore(userID, content, category, name);

      // Refresh the scripts list
      await refreshScripts();

      // Close the add script form
      setShowAddForm((prev) => ({ ...prev, [category]: false }));

      // Dispatch an event to update the scripts list
      window.dispatchEvent(new Event("scriptsUpdated"));
    } catch (error) {
      console.error("Error saving script:", error);
    }
  };

  // Add these additional handlers:

  const handlePlayScript = (script) => {
    if (script.scriptType === "webApps") {
      localStorage.setItem(
        "latestWorkingOnScript",
        JSON.stringify({
          script: script.content,
          scriptName: script.name,
        })
      );
    } else if (script.scriptType === "openSCAD") {
      downloadOpenscadScript(script.content, script.name);
    }
  };

  const handleDownloadScript = (script) => {
    const blob = new Blob([script.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = script.scriptType === "webApps" 
      ? `${script.name}.html` 
      : `${script.name}.scad`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRenameScript = async (category, id, newName) => {
    const userID = localStorage.getItem("userID");
    const script = scripts[category].find((s) => s.id === id);
    
    if (script) {
      await renameScriptInFirestore(
        userID,
        script.timestampString,
        category,
        script.name,
        newName
      );

      setScripts((prevState) => ({
        ...prevState,
        [category]: prevState[category].map((s) =>
          s.id === id ? { ...s, name: newName } : s
        ),
      }));

      // Update workingOnScript in localStorage if this script was selected
      const workingOnScript = JSON.parse(localStorage.getItem("workingOnScript"));
      if (workingOnScript && workingOnScript.script === script.name) {
        localStorage.setItem(
          "workingOnScript",
          JSON.stringify({
            ...workingOnScript,
            script: newName,
          })
        );
      }
    }
    setRenameScriptId(null);
  };

  // Add these handlers after the existing ones:

  const handleSaveFullScreenEdit = async (newContent) => {
    const category = fullScreenEdit.scriptType;
    const userID = localStorage.getItem("userID");

    try {
      const baseName = fullScreenEdit.name.split("-v")[0];

      // Only create a backup if we're not already editing the base version
      if (fullScreenEdit.name !== baseName) {
        // Determine the next version number for the old script
        const currentScripts = scripts[category];
        const versionNumbers = currentScripts
          .filter((script) => script.name.startsWith(baseName))
          .map((script) => {
            const match = script.name.match(/-v(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          });

        const nextVersion = Math.max(...versionNumbers) + 1;
        const oldVersionName = `${baseName}-v${nextVersion}`;

        // Save the old script with the incremented version number
        await saveScriptToFirestore(
          userID,
          fullScreenEdit.content,
          category,
          oldVersionName
        );
      }

      // Save the new content as the base name (latest version)
      await saveScriptToFirestore(userID, newContent, category, baseName);

      // Update local scripts state
      setScripts((prevScripts) => ({
        ...prevScripts,
        [category]: prevScripts[category].map((script) =>
          script.name === fullScreenEdit.name
            ? { ...script, name: baseName, content: newContent }
            : script
        ),
      }));

      // Update localStorage
      const updatedScripts = {
        ...scripts,
        [category]: scripts[category].map((script) =>
          script.name === fullScreenEdit.name
            ? { ...script, name: baseName, content: newContent }
            : script
        ),
      };
      localStorage.setItem(category, JSON.stringify(updatedScripts[category]));

      // Update workingOnScript in localStorage
      localStorage.setItem(
        "workingOnScript",
        JSON.stringify({
          script: baseName,
          contents: newContent,
          scriptType: category,
        })
      );

      setFullScreenEdit(null);
      return Promise.resolve();
    } catch (error) {
      console.error("Error saving:", error);
      return Promise.reject(error);
    }
  };

  const handleRevert = async () => {
    const userID = localStorage.getItem("userID");
    const storedScript = JSON.parse(localStorage.getItem("workingOnScript"));

    if (storedScript) {
      const baseScriptName = storedScript.script.split("-v")[0];
      const versions = await getVersionsOfScriptFromFirestore(
        userID,
        storedScript.scriptType,
        baseScriptName
      );

      if (versions.length > 1) {
        // Get the highest version number
        const latestVersion = versions.reduce(
          (max, version) => Math.max(max, version.versionNumber),
          0
        );

        // Select that version
        const version = versions.find((v) => v.versionNumber === latestVersion);
        await handleVersionSelect(version);
      }
    }
  };

  // Add this effect to handle script updates
  useEffect(() => {
    const handleScriptsUpdate = async () => {
      // Force update the scripts state with the latest data
      setScripts({
        webApps: JSON.parse(localStorage.getItem("webApps")) || [],
        openSCAD: JSON.parse(localStorage.getItem("openSCAD")) || [],
      });

      // Increment refresh trigger to force re-render
      setRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener("scriptsUpdated", handleScriptsUpdate);
    return () => {
      window.removeEventListener("scriptsUpdated", handleScriptsUpdate);
    };
  }, []);

  // Add this effect to sync with Firestore
  useEffect(() => {
    const userID = localStorage.getItem("userID");
    if (userID) {
      // Fetch timestamps for both script types
      getScriptTimestamps(userID, "webApps");
      getScriptTimestamps(userID, "openSCAD");
    }
  }, []);

  // Add this component definition inside ScriptsOverlay component, before the return statement
  const SortButton = () => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      style={styles.sortButton}
      onClick={() =>
        setSortOrder((prev) => (prev === "recent" ? "alphabetical" : "recent"))
      }
    >
      <MdSort style={styles.sortIcon} />
      <span style={styles.sortText}>
        {sortOrder === "recent" ? "Most Recent" : "Alphabetical"}
      </span>
    </motion.div>
  );

  return (
    <div className="modal-overlay" onClick={closeOverlay}>
      <div 
        className="modal-content scripts-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Add selected script overlay at the top */}
        {selectedScript && (
          <motion.div
            style={styles.selectedScriptContainer}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              style={styles.selectedScript}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div style={styles.selectedScriptHeader}>
                <div>
                  <motion.p
                    style={styles.selectedScriptLabel}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                    transition={{ delay: 0.1 }}
                  >
                    Currently Selected
                  </motion.p>
                  <motion.p
                    style={styles.selectedScriptName}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {getBaseNameAndVersion(selectedScript).baseName}
                    {getBaseNameAndVersion(selectedScript).version && (
                      <span style={styles.versionBadge}>
                        v{getBaseNameAndVersion(selectedScript).version}
                      </span>
                    )}
                  </motion.p>
                </div>
                <div style={styles.selectedScriptActions}>
                  <motion.button
                    style={styles.editSelectedButton}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleEditScript(
                      scripts[activeTab].find(s => s.name === selectedScript)
                    )}
                  >
                    Edit
                  </motion.button>
                  <motion.button
                    style={styles.deselectButton}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      localStorage.removeItem("workingOnScript");
                      setSelectedScript(null);
                      window.dispatchEvent(new Event("scriptsUpdated"));
                    }}
                  >
                    Deselect
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        <div className="modal-header">
          <h3>Scripts</h3>
          <MdClose className="close-icon" onClick={closeOverlay} />
        </div>

        <div className="modal-body">
          <div style={styles.tabContainer}>
            <div
              style={{
                ...styles.tab,
                ...(activeTab === "webApps" ? styles.activeTab : {}),
              }}
              onClick={() => setActiveTab("webApps")}
            >
              Web Apps
            </div>
            <div
              style={{
                ...styles.tab,
                ...(activeTab === "openSCAD" ? styles.activeTab : {}),
              }}
              onClick={() => setActiveTab("openSCAD")}
            >
              OpenSCAD
            </div>
          </div>

          <div style={styles.searchSortContainer}>
            <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            <SortButton />
          </div>

          <div style={styles.content}>
            {activeTab === "webApps" && (
              <div style={styles.category}>
                <div style={styles.addScript}>
                  <MdAdd
                    style={styles.addScriptIcon}
                    onClick={() => handleAddScriptClick("webApps")}
                  />
                </div>
                {renderScripts("webApps")}
              </div>
            )}

            {activeTab === "openSCAD" && (
              <div style={styles.category}>
                <div style={styles.addScript}>
                  <MdAdd
                    style={styles.addScriptIcon}
                    onClick={() => handleAddScriptClick("openSCAD")}
                  />
                </div>
                {renderScripts("openSCAD")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add overlays */}
      <AnimatePresence>
        {deleteConfirmation.show && (
          <DeleteConfirmationOverlay
            isOpen={deleteConfirmation.show}
            onClose={() =>
              setDeleteConfirmation({ show: false, script: null, category: null })
            }
            onConfirm={() =>
              handleDeleteScript(
                deleteConfirmation.category,
                deleteConfirmation.script
              )
            }
            scriptName={deleteConfirmation.script?.name}
          />
        )}
      </AnimatePresence>

      {/* Add other overlays as needed */}
      <AnimatePresence>
        {showScriptActions && selectedScript && (
          <ScriptActionsOverlay
            scriptName={selectedScript}
            script={{
              name: selectedScript,
              content: (() => {
                const stored = localStorage.getItem("workingOnScript");
                if (!stored) return "";
                try {
                  const parsed = JSON.parse(stored);
                  return parsed.contents || "";
                } catch (e) {
                  console.error("Error parsing script contents:", e);
                  return "";
                }
              })(),
              scriptType: (() => {
                const stored = localStorage.getItem("workingOnScript");
                if (!stored) return "";
                try {
                  const parsed = JSON.parse(stored);
                  return parsed.scriptType || "";
                } catch (e) {
                  console.error("Error parsing script type:", e);
                  return "";
                }
              })(),
            }}
            onPlay={handlePlayScript}
            onEdit={handleEditScript}
            onDeselect={() => {
              localStorage.removeItem("workingOnScript");
              setSelectedScript(null);
              window.dispatchEvent(new Event("scriptsUpdated"));
            }}
            onClose={() => setShowScriptActions(false)}
          />
        )}
      </AnimatePresence>

      {/* Update the AddScriptOverlay sections */}
      <AnimatePresence>
        {showAddForm.webApps && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10003,
            }}
          >
            <AddScriptOverlay
              isOpen={showAddForm.webApps}
              onClose={() => setShowAddForm(prev => ({ ...prev, webApps: false }))}
              onSave={(name, content) => handleSaveScript("webApps", name, content)}
              category="webApps"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddForm.openSCAD && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10003,
            }}
          >
            <AddScriptOverlay
              isOpen={showAddForm.openSCAD}
              onClose={() => setShowAddForm(prev => ({ ...prev, openSCAD: false }))}
              onSave={(name, content) => handleSaveScript("openSCAD", name, content)}
              category="openSCAD"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {revertConfirmation.show && (
          <RevertConfirmationOverlay
            isOpen={revertConfirmation.show}
            onClose={() =>
              setRevertConfirmation({ show: false, script: null, category: null })
            }
            onConfirm={() => {
              handleDeleteScript(
                revertConfirmation.category,
                revertConfirmation.script
              );
              setRevertConfirmation({ show: false, script: null, category: null });
            }}
            scriptName={
              getBaseNameAndVersion(revertConfirmation.script?.name || "").baseName
            }
            version={(() => {
              if (!revertConfirmation.script) return "";
              const baseScriptName = getBaseNameAndVersion(
                revertConfirmation.script.name
              ).baseName;
              const relatedScripts =
                scripts[revertConfirmation.category]?.filter(
                  (script) =>
                    getBaseNameAndVersion(script.name).baseName === baseScriptName
                ) || [];
              let highestVersion = 0;
              relatedScripts.forEach((script) => {
                const { version } = getBaseNameAndVersion(script.name);
                if (version && parseInt(version) > highestVersion) {
                  highestVersion = parseInt(version);
                }
              });
              return highestVersion.toString();
            })()}
          />
        )}
      </AnimatePresence>

      {fullScreenEdit && (
        <FullScreenEditor
          script={fullScreenEdit}
          onClose={() => setFullScreenEdit(null)}
          onSave={handleSaveFullScreenEdit}
        />
      )}

      {openScadViewer && (
        <OpenSCADViewer
          script={openScadViewer}
          onClose={() => setOpenScadViewer(null)}
        />
      )}
    </div>
  );
};

// Add the remaining styles
const styles = {
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    overflow: "auto",
    flexGrow: 1,
    width: "100%",
    padding: "20px",
    boxSizing: "border-box",
  },
  scriptsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    width: "100%",
    padding: "16px",
    overflowY: "auto",
    overflowX: "hidden",
    flex: 1,
    boxSizing: "border-box",
  },
  scriptCard: {
    backgroundColor: darkModeColors.cardBackground,
    border: `1px solid ${darkModeColors.border}`,
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    cursor: "pointer",
    minHeight: "140px",
  },
  scriptCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "12px",
    width: "100%",
  },
  scriptName: {
    color: darkModeColors.text,
    fontWeight: "600",
    margin: "0",
    width: "100%",
    paddingRight: "16px",
    boxSizing: "border-box",
    wordWrap: "break-word",
    whiteSpace: "normal",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    lineHeight: "1.2",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "8px",
  },
  editButton: {
    padding: "8px 16px",
    backgroundColor: "#4F545C",
    color: darkModeColors.text,
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  moreIcon: {
    fontSize: "20px",
    cursor: "pointer",
    color: darkModeColors.textSecondary,
    transition: "color 0.2s ease, transform 0.2s ease",
  },
  tabContainer: {
    display: "flex",
    padding: "0 20px",
    borderBottom: `1px solid ${darkModeColors.border}`,
    backgroundColor: darkModeColors.headerBackground,
    position: "sticky",
    top: 0,
    zIndex: 1000,
    justifyContent: "center",
  },
  tab: {
    padding: "16px 32px",
    color: darkModeColors.textSecondary,
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "500",
    transition: "all 0.2s ease",
    position: "relative",
    userSelect: "none",
  },
  activeTab: {
    color: darkModeColors.primary,
    "&::after": {
      content: '""',
      position: "absolute",
      bottom: "-1px",
      left: 0,
      width: "100%",
      height: "2px",
      backgroundColor: darkModeColors.primary,
    },
  },
  searchSortContainer: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    padding: "0 20px",
    marginTop: "16px",
  },
  sortButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: darkModeColors.cardBackground,
    border: `1px solid ${darkModeColors.border}`,
    borderRadius: "8px",
    cursor: "pointer",
    color: darkModeColors.textSecondary,
    fontSize: "14px",
    transition: "all 0.2s ease",
    width: "140px",
    flexShrink: 0,
  },
  sortIcon: {
    fontSize: "20px",
  },
  sortText: {
    fontWeight: "500",
  },
  addScript: {
    display: "flex",
    alignItems: "center",
    marginBottom: "10px",
    position: "relative",
    zIndex: 10002,
  },
  addScriptIcon: {
    fontSize: "24px",
    cursor: "pointer",
    color: darkModeColors.textSecondary,
    transition: "all 0.2s ease",
    padding: "8px",
    borderRadius: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      transform: "scale(1.1)",
      color: darkModeColors.primary,
    },
  },
  noResults: {
    color: darkModeColors.textSecondary,
    textAlign: "center",
    padding: "32px 16px",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "200px",
  },
  noResultsText: {
    fontSize: "16px",
    maxWidth: "300px",
    margin: "0 auto",
    lineHeight: "1.5",
    wordWrap: "break-word",
  },
  category: {
    width: "100%",
    margin: "0",
    overflow: "hidden",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },
  selectButton: {
    padding: "8px 16px",
    backgroundColor: darkModeColors.primary,
    color: darkModeColors.text,
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s ease",
  },
  versionBadge: {
    backgroundColor: "#5865F2",
    color: "#FFFFFF",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "10px",
    marginLeft: "8px",
  },
  renameInput: {
    border: "1px solid #444",
    borderRadius: "5px",
    backgroundColor: darkModeColors.foreground,
    color: darkModeColors.text,
    padding: "5px",
    outline: "none",
  },
  cardMenuItem: {
    padding: "8px 16px",
    cursor: "pointer",
    color: darkModeColors.text,
    transition: "all 0.2s ease",
  },
  menuDivider: {
    height: "1px",
    backgroundColor: darkModeColors.border,
    margin: "8px 0",
  },
  selectedScriptContainer: {
    width: "100%",
    padding: "20px",
    boxSizing: "border-box",
    background: `linear-gradient(180deg, ${darkModeColors.headerBackground} 0%, transparent 100%)`,
  },
  selectedScript: {
    backgroundColor: darkModeColors.cardBackground,
    border: `1px solid ${darkModeColors.border}`,
    padding: "24px",
    borderRadius: "16px",
    maxWidth: "800px",
    width: "100%",
    margin: "0 auto",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2)",
    backdropFilter: "blur(10px)",
  },
  selectedScriptHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
  },
  selectedScriptLabel: {
    color: darkModeColors.textSecondary,
    margin: 0,
    fontSize: "14px",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  selectedScriptName: {
    color: darkModeColors.primary,
    fontWeight: "600",
    fontSize: "24px",
    margin: 0,
    wordBreak: "break-word",
  },
  selectedScriptActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  editSelectedButton: {
    backgroundColor: darkModeColors.cardBackground,
    border: `1px solid ${darkModeColors.border}`,
    color: darkModeColors.text,
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  deselectButton: {
    backgroundColor: "transparent",
    border: `2px solid ${darkModeColors.danger}`,
    color: darkModeColors.danger,
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  timestampContainer: {
    position: "absolute",
    bottom: "12px",
    left: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  timestamp: {
    fontSize: "12px",
    color: darkModeColors.textSecondary,
    opacity: 0.8,
    fontWeight: "500",
  },
};

export default ScriptsOverlay; 