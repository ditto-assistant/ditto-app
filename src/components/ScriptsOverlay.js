import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
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
import "./ScriptsOverlay.css";

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
import { useScripts } from "../hooks/useScripts";

// Add import for VersionsOverlay
import VersionsOverlay from "./VersionsOverlay";

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

// Add these helper functions at the top
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
  const [showAddForm, setShowAddForm] = useState({
    webApps: false,
    openSCAD: false,
  });
  // ... copy other state variables

  // Copy all the helper functions from ScriptsScreen
  const getBaseName = (name) => {
    const match = name.match(/^[^\-]+/);
    return match ? match[0].replace(/([a-z])([A-Z])/g, "$1 $2").trim() : name;
  };

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
        const timestampsA = getLocalScriptTimestamps(a.scriptType)[a.name];
        const timestampsB = getLocalScriptTimestamps(b.scriptType)[b.name];

        if (!timestampsA || !timestampsB) return 0;

        const timeA = timestampsA.timestamp.seconds * 1000;
        const timeB = timestampsB.timestamp.seconds * 1000;

        return timeB - timeA; // Most recent first
      });
    }
  };

  // ... copy other helper functions

  // Add these additional states
  const [activeCard, setActiveCard] = useState(null);
  const [menuPosition, setMenuPosition] = useState(null);
  const [selectedScript, setSelectedScript] = useState(() => {
    const storedScript = localStorage.getItem("workingOnScript");
    return storedScript ? JSON.parse(storedScript).script : null;
  });
  const [renameScriptId, setRenameScriptId] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    script: null,
    category: null,
    isDeleteAll: false,
  });
  const [versionOverlay, setVersionOverlay] = useState(null);
  const [fullScreenEdit, setFullScreenEdit] = useState(null);
  const [openScadViewer, setOpenScadViewer] = useState(null);
  const cardRefs = useRef({});

  // Add these state variables at the top with the others:
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
    // Update localStorage
    localStorage.setItem(
      "workingOnScript",
      JSON.stringify({
        script: script.name,
        contents: script.content,
        scriptType: script.scriptType,
      })
    );

    // Update local state
    setSelectedScript(script.name);

    // Dispatch events
    window.dispatchEvent(new Event("scriptSelected"));
    window.dispatchEvent(new Event("scriptsUpdated"));
  };

  const handleDeselectScript = () => {
    // Clear localStorage first
    localStorage.removeItem("workingOnScript");

    // Update local state
    setSelectedScript(null);

    // Dispatch events in the correct order
    window.dispatchEvent(new Event("scriptSelected"));
    window.dispatchEvent(new Event("scriptsUpdated"));

    // Close any open menus/overlays
    setActiveCard(null);
    setMenuPosition(null);
    setVersionOverlay(null);
  };

  const handleDeleteScript = async (
    category,
    currentScript,
    deleteAllVersions = true
  ) => {
    setDeleteConfirmation({ show: false, script: null, category: null });

    const userID = localStorage.getItem("userID");
    const baseScriptName = getBaseNameAndVersion(currentScript.name).baseName;

    try {
      if (deleteAllVersions) {
        // Find all versions of this script
        const relatedScripts = scripts[category].filter(
          (script) =>
            getBaseNameAndVersion(script.name).baseName === baseScriptName
        );

        // Delete all versions from Firestore
        for (const script of relatedScripts) {
          await deleteScriptFromFirestore(userID, category, script.name);
        }

        // If any version was selected, clear selection
        if (relatedScripts.some((script) => script.name === selectedScript)) {
          localStorage.removeItem("workingOnScript");
          setSelectedScript(null);
        }

        // Close version overlay since all versions are deleted
        setVersionOverlay(null);

        // 🛠️ Update scripts state to remove deleted scripts
        setScripts((prevScripts) => ({
          ...prevScripts,
          [category]: prevScripts[category].filter(
            (script) =>
              getBaseNameAndVersion(script.name).baseName !== baseScriptName
          ),
        }));

        // 🛠️ Update localStorage
        localStorage.setItem(
          category,
          JSON.stringify(
            scripts[category].filter(
              (script) =>
                getBaseNameAndVersion(script.name).baseName !== baseScriptName
            )
          )
        );
      } else {
        // Delete only the specific version
        await deleteScriptFromFirestore(userID, category, currentScript.name);

        // If this version was selected, clear selection
        if (currentScript.name === selectedScript) {
          localStorage.removeItem("workingOnScript");
          setSelectedScript(null);
        }

        // 🛠️ Update scripts state to remove the deleted script
        setScripts((prevScripts) => ({
          ...prevScripts,
          [category]: prevScripts[category].filter(
            (script) => script.name !== currentScript.name
          ),
        }));

        // 🛠️ Update localStorage
        localStorage.setItem(
          category,
          JSON.stringify(
            scripts[category].filter(
              (script) => script.name !== currentScript.name
            )
          )
        );

        // Update version overlay if it's open
        if (versionOverlay) {
          const remainingVersions = versionOverlay.versions.filter(
            (script) => script.name !== currentScript.name
          );

          if (remainingVersions.length === 0) {
            // If no versions left, close the overlay
            setVersionOverlay(null);
          } else {
            // Update versions in the overlay
            setVersionOverlay({
              ...versionOverlay,
              versions: remainingVersions,
            });
          }
        }
      }

      // Dispatch event to update UI
      window.dispatchEvent(new Event("scriptsUpdated"));
    } catch (error) {
      console.error("Error deleting script:", error);
    }
  };

  const handleVersionButtonClick = async (baseName, event) => {
    event.stopPropagation();
    console.log("Version button clicked for:", baseName);

    // Get all versions of this script
    const versions = scripts[activeTab].filter(
      (script) => getBaseName(script.name.replace(/ /g, "")) === baseName
    );
    console.log("Found versions:", versions);

    if (versions.length > 0) {
      const menuRect = event.currentTarget
        .closest(".card-menu")
        .getBoundingClientRect();

      setMenuPosition({
        top: menuRect.top,
        left: menuRect.right + 8,
        openUpward: false,
      });

      setVersionOverlay({
        baseScriptName: baseName,
        versions: versions,
      });
    }
  };

  const handleSelectVersion = (script) => {
    // Update localStorage
    localStorage.setItem(
      "workingOnScript",
      JSON.stringify({
        script: script.name,
        contents: script.content,
        scriptType: activeTab,
      })
    );

    // Update local state
    setSelectedScript(script.name);

    // Close overlays
    setVersionOverlay(null);
    setActiveCard(null);
    setMenuPosition(null);

    // Dispatch events to update UI
    window.dispatchEvent(new Event("scriptSelected"));
    window.dispatchEvent(new Event("scriptsUpdated"));
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
          const currentScript =
            scriptsList.find((s) => s.name === selectedScript) ||
            scriptsList.find((s) => !s.name.includes("-v")) ||
            scriptsList[0];

          // Check for multiple versions by looking at the base name
          const hasMultipleVersions =
            scripts[category].filter(
              (script) =>
                getBaseName(script.name.replace(/ /g, "")) === baseName
            ).length > 1;

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
              </div>

              <div style={styles.timestampContainer}>
                <span style={styles.timestamp}>
                  {formatTimestamp(
                    getLocalScriptTimestamps(category)[currentScript.name]
                      ?.timestamp,
                    currentScript,
                    category
                  )}
                </span>
              </div>

              <div style={styles.actions}>
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
                    style={styles.cardMenuItem}
                    whileHover={{ backgroundColor: "rgba(88, 101, 242, 0.1)" }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setRenameScriptId(currentScript.id);
                      setActiveCard(null);
                      setMenuPosition(null);
                    }}
                  >
                    Rename
                  </motion.div>
                  <motion.div
                    style={styles.cardMenuItem}
                    whileHover={{ backgroundColor: "rgba(88, 101, 242, 0.1)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadScript(currentScript);
                      setActiveCard(null);
                      setMenuPosition(null);
                    }}
                  >
                    Download
                  </motion.div>
                  {hasMultipleVersions && (
                    <motion.div
                      style={styles.cardMenuItem}
                      whileHover={{
                        backgroundColor: "rgba(88, 101, 242, 0.1)",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const versions = scripts[activeTab].filter(
                          (script) =>
                            getBaseName(script.name.replace(/ /g, "")) ===
                            baseName
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
                  <div style={styles.menuDivider} />
                  {hasMultipleVersions && (
                    <motion.div
                      style={{
                        ...styles.cardMenuItem,
                        color: darkModeColors.primary,
                      }}
                      whileHover={{
                        backgroundColor: "rgba(88, 101, 242, 0.1)",
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
                    </motion.div>
                  )}
                  <motion.div
                    style={{
                      ...styles.cardMenuItem,
                      color: darkModeColors.danger,
                    }}
                    whileHover={{ backgroundColor: "rgba(218, 55, 60, 0.1)" }}
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
                  </motion.div>
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
    let filteredScripts = scripts;
    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      filteredScripts = scripts.filter((script) => {
        const baseName = getBaseName(
          script.name.replace(/ /g, "")
        ).toLowerCase();
        return baseName.includes(normalizedSearch);
      });
    }
    return sortScripts(filteredScripts);
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

    // Sort versions with the selected version at the top, followed by latest (no -v tag),
    // then other versions in descending order
    Object.keys(grouped).forEach((baseName) => {
      grouped[baseName].sort((a, b) => {
        // If one is selected, it should be first
        if (a.name === selectedScript) return -1;
        if (b.name === selectedScript) return 1;

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

  const handleEditScript = (script) => {
    if (script.scriptType === "webApps") {
      closeOverlay();
      window.dispatchEvent(
        new CustomEvent("editScript", {
          detail: { script },
        })
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
      closeOverlay(); // Close overlay before navigating
    } else if (script.scriptType === "openSCAD") {
      downloadOpenscadScript(script.content, script.name);
      closeOverlay(); // Close overlay after initiating download
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
      const userID = localStorage.getItem("userID");
      try {
        // Get the timestamp string from the script
        const timestamps = getLocalScriptTimestamps(category);
        const timestampString = timestamps[script.name]?.timestampString;

        await renameScriptInFirestore(
          userID,
          timestampString,
          category,
          script.name,
          newName
        );

        // Update workingOnScript in localStorage if this script was selected
        const workingOnScript = JSON.parse(
          localStorage.getItem("workingOnScript")
        );
        if (workingOnScript && workingOnScript.script === script.name) {
          localStorage.setItem(
            "workingOnScript",
            JSON.stringify({
              ...workingOnScript,
              script: newName,
            })
          );
          setSelectedScript(newName);
        }

        // Refresh timestamps
        await getScriptTimestamps(userID, category);

        // Refresh all scripts from Firestore
        await syncLocalScriptsWithFirestore(userID, category);

        // Immediately update local scripts state
        const freshScripts = JSON.parse(localStorage.getItem(category)) || [];
        setScripts((prevScripts) => ({
          ...prevScripts,
          [category]: freshScripts,
        }));

        // Force a re-render by updating refreshTrigger
        setRefreshTrigger((prev) => prev + 1);

        // Dispatch events to update UI
        window.dispatchEvent(new Event("scriptsUpdated"));
        window.dispatchEvent(new Event("scriptSelected"));
      } catch (error) {
        console.error("Error renaming script:", error);
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
      onClick={() => {
        setSortOrder((prev) => {
          const newOrder = prev === "recent" ? "alphabetical" : "recent";
          return newOrder;
        });
        // Force a re-render
        setRefreshTrigger((prev) => prev + 1);
      }}
    >
      <MdSort style={styles.sortIcon} />
      <span style={styles.sortText}>
        {sortOrder === "recent" ? "Most Recent" : "Alphabetical"}
      </span>
    </motion.div>
  );

  // Add this effect to keep selectedScript in sync
  useEffect(() => {
    const handleScriptsUpdate = () => {
      const storedScript = localStorage.getItem("workingOnScript");
      setSelectedScript(storedScript ? JSON.parse(storedScript).script : null);
    };

    window.addEventListener("scriptsUpdated", handleScriptsUpdate);
    return () =>
      window.removeEventListener("scriptsUpdated", handleScriptsUpdate);
  }, []);

  // Add this effect to close overlays when clicking outside
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

  // Add handleRevertScript function
  const handleRevertScript = async (category, currentScript) => {
    setRevertConfirmation({ show: false, script: null, category: null });

    const userID = localStorage.getItem("userID");
    try {
      // Delete the current version (which will become the new version)
      await deleteScriptFromFirestore(userID, category, currentScript.name);

      // Update local state
      setScripts((prevState) => ({
        ...prevState,
        [category]: prevState[category].filter(
          (script) => script.name !== currentScript.name
        ),
      }));

      // If this was the selected script, clear selection
      if (currentScript.name === selectedScript) {
        localStorage.removeItem("workingOnScript");
        setSelectedScript(null);
        window.dispatchEvent(new Event("scriptsUpdated"));
      }
    } catch (error) {
      console.error("Error reverting script:", error);
    }
  };

  return (
    <div className="modal-overlay" onClick={closeOverlay}>
      <div className="scripts-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Scripts</h3>
          <MdClose className="close-icon" onClick={closeOverlay} />
        </div>

        {/* Selected script section with enhanced animations */}
        <div className="modal-header">
          <h3>Scripts</h3>
          <MdClose className="close-icon" onClick={closeOverlay} />
        </div>

        {/* Selected script section with enhanced animations */}
        {selectedScript && (
          <motion.div
            style={styles.selectedScriptContainer}
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
              style={styles.selectedScript}
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
                style={styles.selectedScriptHeader}
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
                <p style={styles.selectedScriptLabel}>Currently Selected</p>
                <div style={styles.selectedScriptActions}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={styles.editSelectedButton}
                    onClick={() => {
                      const script = scripts[activeTab].find(
                        (s) => s.name === selectedScript
                      );
                      if (script) handleEditScript(script);
                    }}
                  >
                    Edit
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={styles.deselectButton}
                    onClick={handleDeselectScript}
                  >
                    Deselect
                  </motion.button>
                </div>
              </motion.div>
              <motion.h2
                style={styles.selectedScriptName}
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
                {selectedScript}
              </motion.h2>
            </motion.div>
          </motion.div>
        )}

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

        {/* Overlays */}
        <AnimatePresence>
          {showAddForm[activeTab] && (
            <AddScriptOverlay
              isOpen={showAddForm[activeTab]}
              onClose={() =>
                setShowAddForm((prev) => ({ ...prev, [activeTab]: false }))
              }
              onSave={() => {
                const nameInput = document.getElementById(
                  `${activeTab}-name-input`
                ).value;
                const contentInput = document.getElementById(
                  `${activeTab}-content-input`
                ).value;
                handleSaveScript(activeTab, nameInput, contentInput);
              }}
              category={activeTab}
            />
          )}
        </AnimatePresence>

        {deleteConfirmation.show && (
          <DeleteConfirmationOverlay
            isOpen={deleteConfirmation.show}
            onClose={() =>
              setDeleteConfirmation({
                show: false,
                script: null,
                category: null,
              })
            }
            onConfirm={() =>
              handleDeleteScript(
                deleteConfirmation.category,
                deleteConfirmation.script
              )
            }
            scriptName={deleteConfirmation.script?.name}
            isDeleteAll={deleteConfirmation.isDeleteAll}
          />
        )}

        {openScadViewer && (
          <OpenSCADViewer
            script={openScadViewer}
            onClose={() => setOpenScadViewer(null)}
          />
        )}

        {revertConfirmation.show && (
          <RevertConfirmationOverlay
            isOpen={revertConfirmation.show}
            onClose={() =>
              setRevertConfirmation({
                show: false,
                script: null,
                category: null,
              })
            }
            onConfirm={() =>
              handleRevertScript(
                revertConfirmation.category,
                revertConfirmation.script
              )
            }
            scriptName={
              getBaseNameAndVersion(revertConfirmation.script?.name || "")
                .baseName
            }
            version={(() => {
              if (!revertConfirmation.script) return "";
              const baseScriptName = getBaseNameAndVersion(
                revertConfirmation.script.name
              ).baseName;
              const relatedScripts =
                scripts[revertConfirmation.category]?.filter(
                  (script) =>
                    getBaseNameAndVersion(script.name).baseName ===
                    baseScriptName
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

        {versionOverlay && (
          <VersionsOverlay
            isOpen={!!versionOverlay}
            onClose={() => setVersionOverlay(null)}
            onSelect={handleSelectVersion}
            onDelete={handleDeleteScript}
            onDelete={handleDeleteScript}
            versions={versionOverlay.versions}
            category={activeTab}
            category={activeTab}
          />
        )}
      </div>
    </div>
  );
};

// Update the styles object with more precise styling
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
    justifyContent: "space-between",
    position: "relative",
    cursor: "pointer",
    minHeight: "140px",
    boxSizing: "border-box",
  },
  scriptCardHeader: {
    display: "flex",
    justifyContent: "flex-start",
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
    position: "absolute",
    bottom: "12px",
    right: "12px",
  },
  editButton: {
    padding: "6px 12px",
    backgroundColor: "#4F545C",
    color: darkModeColors.text,
    borderRadius: "4px",
    cursor: "pointer",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: "#5d6269",
    },
  },
  selectButton: {
    padding: "6px 12px",
    backgroundColor: darkModeColors.primary,
    color: darkModeColors.text,
    borderRadius: "4px",
    cursor: "pointer",
    border: "none",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: darkModeColors.secondary,
    },
  },
  moreIcon: {
    fontSize: "18px",
    cursor: "pointer",
    color: darkModeColors.textSecondary,
    transition: "all 0.2s ease",
    padding: "8px",
    borderRadius: "50%",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)",
      color: darkModeColors.text,
    },
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
  versionBadge: {
    backgroundColor: "#5865F2",
    color: "#FFFFFF",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "10px",
    marginLeft: "8px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    height: "16px",
  },
  renameInput: {
    border: `1px solid ${darkModeColors.border}`,
    borderRadius: "4px",
    backgroundColor: darkModeColors.foreground,
    color: darkModeColors.text,
    padding: "8px 12px",
    fontSize: "14px",
    fontWeight: "500",
    width: "100%",
    outline: "none",
    "&:focus": {
      borderColor: darkModeColors.primary,
    },
  },
  cardMenuItem: {
    padding: "8px 16px",
    cursor: "pointer",
    color: darkModeColors.textSecondary,
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    width: "100%",
    boxSizing: "border-box",
  },
  menuDivider: {
    height: "1px",
    backgroundColor: darkModeColors.border,
    margin: "4px 0",
  },
  selectedScriptContainer: {
    width: "100%",
    padding: "20px",
    boxSizing: "border-box",
    background: "transparent",
    background: "transparent",
    display: "flex",
    justifyContent: "center",
    borderBottom: `1px solid ${darkModeColors.border}`,
    borderBottom: `1px solid ${darkModeColors.border}`,
  },
  selectedScript: {
    backgroundColor: "#2B2D31",
    backgroundColor: "#2B2D31",
    border: `1px solid ${darkModeColors.border}`,
    padding: "16px 20px",
    borderRadius: "12px",
    padding: "16px 20px",
    borderRadius: "12px",
    maxWidth: "800px",
    width: "100%",
    margin: "0 auto",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.2)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    gap: "8px",
  },
  selectedScriptHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  selectedScriptLabel: {
    color: "#99AAB5",
    color: "#99AAB5",
    margin: 0,
    fontSize: "12px",
    fontWeight: "600",
    fontSize: "12px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  selectedScriptName: {
    color: "#7289DA",
    color: "#7289DA",
    fontWeight: "600",
    fontSize: "18px",
    fontSize: "18px",
    margin: 0,
    wordBreak: "break-word",
  },
  selectedScriptActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    gap: "8px",
  },
  editSelectedButton: {
    backgroundColor: "#4F545C",
    border: "none",
    color: "#FFFFFF",
    padding: "6px 12px",
    borderRadius: "4px",
    fontSize: "13px",
    backgroundColor: "#4F545C",
    border: "none",
    color: "#FFFFFF",
    padding: "6px 12px",
    borderRadius: "4px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  deselectButton: {
    backgroundColor: "transparent",
    border: "1px solid #DA373C",
    color: "#DA373C",
    padding: "6px 12px",
    borderRadius: "4px",
    fontSize: "13px",
    border: "1px solid #DA373C",
    color: "#DA373C",
    padding: "6px 12px",
    borderRadius: "4px",
    fontSize: "13px",
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
  latestBadge: {
    backgroundColor: "#28A745",
    color: "#FFFFFF",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "10px",
    marginLeft: "8px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    height: "16px",
  },
};

export default ScriptsOverlay;
