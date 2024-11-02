import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { MdAdd, MdMoreVert, MdSort } from "react-icons/md";
import { FaPlay, FaArrowLeft, FaTrash, FaDownload, FaUndo } from "react-icons/fa"; // Add FaTrash and FaDownload import
import {
    deleteScriptFromFirestore,
    saveScriptToFirestore,
    renameScriptInFirestore,
    getLocalScriptTimestamps,
    getScriptTimestamps,
} from "../control/firebase";
import { downloadOpenscadScript } from "../control/agentTools";
import { Button } from '@mui/material';
import FullScreenSpinner from "../components/LoadingSpinner";
import FullScreenEditor from '../components/FullScreenEditor';
import CardMenu from '../components/CardMenu';
import VersionOverlay from '../components/VersionOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import DeleteConfirmationOverlay from '../components/DeleteConfirmationOverlay';
import SearchBar from '../components/SearchBar';
import AddScriptOverlay from '../components/AddScriptOverlay';
import OpenSCADViewer from '../components/OpenSCADViewer';
import RevertConfirmationOverlay from '../components/RevertConfirmationOverlay';

const darkModeColors = {
    background: '#1E1F22',
    foreground: '#2B2D31',
    primary: '#5865F2',
    secondary: '#4752C4',
    text: '#FFFFFF',
    textSecondary: '#B5BAC1',
    border: '#1E1F22',
    danger: '#DA373C',
    cardBackground: '#313338',
    headerBackground: '#2B2D31',
    inputBackground: '#1E1F22',
};

const AceEditor = lazy(() => import("react-ace"));

const ScriptsScreen = () => {
    const [aceLoaded, setAceLoaded] = useState(false);
    const navigate = useNavigate();
    const localWebApps = JSON.parse(localStorage.getItem("webApps")) || [];
    const localOpenSCAD = JSON.parse(localStorage.getItem("openSCAD")) || [];
    const [scripts, setScripts] = useState({
        webApps: localWebApps,
        openSCAD: localOpenSCAD,
    });
    const localWorkingOnScript = JSON.parse(localStorage.getItem("workingOnScript")) || {};
    const [selectedScript, setSelectedScript] = useState(localWorkingOnScript.script || null);

    const [activeCard, setActiveCard] = useState(null);
    const [renameScriptId, setRenameScriptId] = useState(null);
    const [editScript, setEditScript] = useState(null);
    const [temporaryEditContent, setTemporaryEditContent] = useState("");
    const [showAddForm, setShowAddForm] = useState({ webApps: false, openSCAD: false });
    const [versionOverlay, setVersionOverlay] = useState(null);
    const [currentVersion, setCurrentVersion] = useState({});
    const versionOverlayRef = useRef(null);

    const [fullScreenEdit, setFullScreenEdit] = useState(null);

    const [menuPosition, setMenuPosition] = useState(null);

    // Move cardRef outside of the render function
    const cardRefs = useRef({});

    const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, script: null, category: null });

    const [activeTab, setActiveTab] = useState('webApps');

    const [searchTerm, setSearchTerm] = useState('');

    const [openScadViewer, setOpenScadViewer] = useState(null);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [sortOrder, setSortOrder] = useState('recent');

    const [revertConfirmation, setRevertConfirmation] = useState({ 
        show: false, 
        script: null, 
        category: null 
    });

    const sortScripts = (scripts) => {
        if (sortOrder === 'alphabetical') {
            return [...scripts].sort((a, b) => a.name.localeCompare(b.name));
        } else {
            // Sort by most recent first using the timestamp
            return [...scripts].sort((a, b) => {
                const timestampsA = getLocalScriptTimestamps(a.scriptType)[a.name];
                const timestampsB = getLocalScriptTimestamps(b.scriptType)[b.name];
                
                if (!timestampsA || !timestampsB) return 0;
                
                // Convert Firestore timestamps to milliseconds for comparison
                const timeA = timestampsA.timestamp.seconds * 1000;
                const timeB = timestampsB.timestamp.seconds * 1000;
                
                return timeB - timeA;
            });
        }
    };

    const filterScripts = (scripts, searchTerm) => {
        let filteredScripts = scripts;
        if (searchTerm) {
            const normalizedSearch = searchTerm.toLowerCase();
            filteredScripts = scripts.filter(script => {
                const baseName = getBaseName(script.name.replace(/ /g, "")).toLowerCase();
                return baseName.includes(normalizedSearch);
            });
        }
        return sortScripts(filteredScripts);
    };

    const SortButton = () => (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={styles.sortButton}
            onClick={() => setSortOrder(prev => prev === 'recent' ? 'alphabetical' : 'recent')}
        >
            <MdSort style={styles.sortIcon} />
            <span style={styles.sortText}>
                {sortOrder === 'recent' ? 'Most Recent' : 'Alphabetical'}
            </span>
        </motion.div>
    );

    useEffect(() => {
        const loadAce = async () => {
            await import("ace-builds/src-noconflict/ace");
            await import("ace-builds/src-noconflict/mode-javascript");
            await import("ace-builds/src-noconflict/theme-monokai");
            await import("ace-builds/src-noconflict/ext-language_tools");
            setAceLoaded(true);
        };
        loadAce();
    }, []);

    // re-set location state if scripts are updated via useEffect
    useEffect(() => {
        // update localStorages for scripts
        localStorage.setItem("webApps", JSON.stringify(scripts.webApps));
        localStorage.setItem("openSCAD", JSON.stringify(scripts.openSCAD));
    }, [scripts]);

    const handleAddScriptClick = (category) => {
        setShowAddForm((prev) => ({ ...prev, [category]: true }));
    };

    const handleCancelAddScript = (category) => {
        setShowAddForm((prev) => ({ ...prev, [category]: false }));
    };

    const handleSaveScript = (category) => {
        const nameInput = document.getElementById(`${category}-name-input`).value;
        const contentInput = document.getElementById(`${category}-content-input`).value;
        if (nameInput && contentInput) {
            const newScript = { id: Date.now(), name: nameInput, content: contentInput, scriptType: category };
            setScripts((prevState) => ({
                ...prevState,
                [category]: [...prevState[category], newScript],
            }));
            const userID = localStorage.getItem("userID");
            saveScriptToFirestore(userID, contentInput, category, nameInput);
            setShowAddForm((prev) => ({ ...prev, [category]: false }));
        }
    };

    const handleSelectScript = (script) => {
        localStorage.setItem(
            "workingOnScript",
            JSON.stringify({ script: script.name, contents: script.content, scriptType: script.scriptType })
        );
        setSelectedScript(script.name);
        setCurrentVersion((prevState) => ({ ...prevState, [script.scriptType]: script }));
    };

    const handleDeselectScript = () => {
        localStorage.removeItem("workingOnScript");
        setSelectedScript(null);
    };

    const handleLaunchScript = () => {
        console.log("selectedScript:", selectedScript); // Bowling App (for example)
        const selected = scripts.webApps.find((script) => script.name === selectedScript) || scripts.openSCAD.find((script) => script.name === selectedScript);
        if (selected) {
            handlePlayScript(selected);
        }
    };

    const handleRenameScript = async (category, id, newName) => {
        setScripts((prevState) => ({
            ...prevState,
            [category]: prevState[category].map((script) =>
                script.id === id ? { ...script, name: newName } : script
            ),
        }));
        const userID = localStorage.getItem("userID");
        const script = scripts[category].find((script) => script.id === id);
        await renameScriptInFirestore(userID, id, category, script.name, newName);
        // update selectedScript and localStorage's workingOnScript if the renamed script is the selected script
        if (selectedScript === script.name) {
            localStorage.setItem("workingOnScript", JSON.stringify({ script: newName, contents: script.content, scriptType: category }));
            setSelectedScript(newName);
        }
        setRenameScriptId(null);
    };

    const handleDeleteScript = async (category, currentScript) => {
        setDeleteConfirmation({ show: false, script: null, category: null });
        
        const userID = localStorage.getItem("userID");
        
        // Check if this is a base version (no -v tag)
        const isBaseVersion = !currentScript.name.includes('-v');
        
        if (isBaseVersion) {
            // Find all versions of this script
            const baseScriptName = getBaseNameAndVersion(currentScript.name).baseName;
            const relatedScripts = scripts[category].filter(script => 
                getBaseNameAndVersion(script.name).baseName === baseScriptName
            );
            
            // If there are other versions, promote the highest version
            if (relatedScripts.length > 1) {
                // Find the highest version number
                let highestVersion = 0;
                let newestScript = null;
                
                relatedScripts.forEach(script => {
                    const { version } = getBaseNameAndVersion(script.name);
                    if (version && parseInt(version) > highestVersion) {
                        highestVersion = parseInt(version);
                        newestScript = script;
                    }
                });
                
                if (newestScript) {
                    // Rename the highest version to be the new base version
                    const newName = baseScriptName;
                    const oldName = newestScript.name;
                    
                    // Update in Firestore
                    await renameScriptInFirestore(userID, newestScript.id, category, oldName, newName);
                    
                    // Update in local state
                    setScripts(prevState => ({
                        ...prevState,
                        [category]: prevState[category].map(script => 
                            script.id === newestScript.id 
                                ? { ...script, name: newName }
                                : script
                        ).filter(script => script.id !== currentScript.id)
                    }));
                    
                    // Update selected script if necessary
                    if (selectedScript === currentScript.name) {
                        localStorage.setItem("workingOnScript", JSON.stringify({ 
                            script: newName, 
                            contents: newestScript.content, 
                            scriptType: category 
                        }));
                        setSelectedScript(newName);
                        setCurrentVersion(prev => ({ ...prev, [category]: { ...newestScript, name: newName } }));
                    }
                    
                    // Delete the old base version from Firestore
                    await deleteScriptFromFirestore(userID, category, currentScript.name);
                    return;
                }
            }
        }
        
        // Regular delete flow for non-base versions or if no promotion needed
        setScripts((prevState) => ({
            ...prevState,
            [category]: prevState[category].filter((script) => script.id !== currentScript.id),
        }));
        setActiveCard(null);
        
        await deleteScriptFromFirestore(userID, category, currentScript.name);
        
        if (selectedScript === currentScript.name) {
            localStorage.removeItem("workingOnScript");
            setSelectedScript(null);
            setCurrentVersion((prevState) => ({ ...prevState, [category]: undefined }));
        }
    };

    const handlePlayScript = (script) => {
        const { content, name, scriptType } = script;
        if (scriptType === "webApps") {
            // downloadHTMLScript(content, name);
            navigate("/canvas", { state: { script: content, scriptName: name } });
        } else if (scriptType === "openSCAD") {
            downloadOpenscadScript(content, name);
        }
    };

    const handleEditScript = (script) => {
        // Add a small delay to ensure menu is closed before opening editor
        setTimeout(() => {
            if (script.scriptType === 'webApps') {
                setFullScreenEdit(script);
            } else {
                setEditScript(script);
                setTemporaryEditContent(script.content);
            }
        }, 50);
    };

    const handleSaveEdit = async (category, id) => {
        if (code !== node.outerHTML) {
            await onSave(node, code); // Ensure the save is awaited
        }
        onClose();

        // Define newName correctly by retrieving the updated script's name
        const updatedScript = scripts[category].find(s => s.id === id);
        const newName = updatedScript.name;

        // Update workingOnScript in localStorage with the new script details
        const workingOnScript = JSON.parse(localStorage.getItem("workingOnScript"));
        if (workingOnScript && workingOnScript.script === newName) {
            localStorage.setItem("workingOnScript", JSON.stringify({ 
                script: newName, 
                contents: code, 
                scriptType: category 
            }));
        }
    };

    const handleCancelEditScript = () => {
        setEditScript(null);
    };

    const handleVersionButtonClick = (baseName) => {
        setVersionOverlay(baseName);
    };

    const handleSelectVersion = (versionedScript) => {
        handleSelectScript(versionedScript);
        setVersionOverlay(null);
    };

    const handleOverlayClick = (event) => {
        if (versionOverlayRef.current && !versionOverlayRef.current.contains(event.target)) {
            setVersionOverlay(null);
        }
    };

    const getBaseName = (name) => {
        const match = name.match(/^[^\-]+/);
        let res = match ? match[0].replace(/([a-z])([A-Z])/g, '$1 $2').trim() : name;
        return res;
    };

    const getScriptsByBaseName = (scripts) => {
        const grouped = {};
        scripts.forEach((script) => {
            const baseName = getBaseName(script.name.replace(/ /g, ""));
            if (!grouped[baseName]) grouped[baseName] = [];
            grouped[baseName].push(script);
        });
        // for each base name, sort the scripts by name to where the one without a version number is first
        // and the rest are sorted by version number, where the highest is first
        // exception for top-most: if currently selected script is not the top-most, then it should be the top-most
        let sortedGrouped = {};
        Object.keys(grouped).forEach((baseName) => {
            const sorted = grouped[baseName].sort((a, b) => {
                const aMatch = a.name.match(/v(\d+)/);
                const bMatch = b.name.match(/v(\d+)/);
                if (!aMatch && !bMatch) return 0;
                if (!aMatch) return -1;
                if (!bMatch) return 1;
                return parseInt(bMatch[1]) - parseInt(aMatch[1]);
            }
            );
            sortedGrouped[baseName] = sorted;
            const selected = sorted.find((s) => s.name === selectedScript);
            if (selected) {
                const idx = sorted.indexOf(selected);
                sorted.splice(idx, 1);
                sorted.unshift(selected);
            }
        });
        return sortedGrouped;
    };

    const handleDownloadScript = (script) => {
        const { content, name, scriptType } = script;
        const blob = new Blob([content], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        if (scriptType === "webApps") {
            a.download = `${name}.html`;
        } else if (scriptType === "openSCAD") {
            a.download = `${name}.scad`;
        }
        a.click();
    };

    const handleSaveFullScreenEdit = async (newContent) => {
        const category = fullScreenEdit.scriptType;
        const userID = localStorage.getItem("userID");

        try {
            const baseName = fullScreenEdit.name.split('-v')[0];
            
            // Only create a backup if we're not already editing the base version
            if (fullScreenEdit.name !== baseName) {
                // Determine the next version number for the old script
                const currentScripts = scripts[category];
                const versionNumbers = currentScripts
                    .filter(script => script.name.startsWith(baseName))
                    .map(script => {
                        const match = script.name.match(/-v(\d+)$/);
                        return match ? parseInt(match[1], 10) : 0;
                    });

                const nextVersion = Math.max(...versionNumbers) + 1;
                const oldVersionName = `${baseName}-v${nextVersion}`;

                // Save the old script with the incremented version number
                await saveScriptToFirestore(userID, fullScreenEdit.content, category, oldVersionName);
            }

            // Save the new content as the base name (latest version)
            await saveScriptToFirestore(userID, newContent, category, baseName);

            // Update local scripts state directly
            setScripts(prevScripts => ({
                ...prevScripts,
                [category]: prevScripts[category].map(script =>
                    script.name === fullScreenEdit.name
                        ? { ...script, name: baseName, content: newContent }
                        : script
                )
            }));

            // Update localStorage
            const updatedScripts = {
                ...scripts,
                [category]: scripts[category].map(script =>
                    script.name === fullScreenEdit.name
                        ? { ...script, name: baseName, content: newContent }
                        : script
                )
            };
            localStorage.setItem(category, JSON.stringify(updatedScripts[category]));

            // Update workingOnScript in localStorage
            localStorage.setItem("workingOnScript", JSON.stringify({
                script: baseName,
                contents: newContent,
                scriptType: category
            }));

            return Promise.resolve();
        } catch (error) {
            console.error('Error saving:', error);
            return Promise.reject(error);
        }
    };

    const getFontSize = (name) => {
        if (name.length > 50) return '10px';
        if (name.length > 40) return '11px';
        if (name.length > 30) return '12px';
        if (name.length > 20) return '14px';
        return '16px';
    };

    const renderVersionOverlay = (baseName, scriptsList, cardRect) => {
        if (versionOverlay !== baseName) return null;

        const windowHeight = window.innerHeight;
        const overlayHeight = Math.min(scriptsList.length * 40 + 16, 200);
        const spaceBelow = windowHeight - cardRect.bottom;
        const spaceAbove = cardRect.top;
        
        const openUpward = spaceBelow < overlayHeight && spaceAbove > overlayHeight;

        const style = {
            ...styles.versionOverlay,
            position: 'fixed',
            top: openUpward ? cardRect.top - overlayHeight - 5 : cardRect.bottom + 5,
            left: cardRect.left,
            width: cardRect.width,
            transformOrigin: openUpward ? 'bottom' : 'top',
        };

        const handleDeleteVersion = (index) => {
            const scriptToDelete = sortedScriptsList[index];
            setDeleteConfirmation({ 
                show: true, 
                script: scriptToDelete, 
                category: scriptToDelete.scriptType 
            });
        };

        // Find the currently displayed script for this specific app
        const currentlyDisplayedScript = currentVersion[activeTab] && 
            scriptsList.find(s => s.name === currentVersion[activeTab].name) || 
            scriptsList.find(s => !s.name.includes('-v')); // Find the latest version for this app

        // Filter out the currently selected version and the latest version if it's currently displayed
        const filteredScriptsList = scriptsList.filter(script => {
            if (script.name === selectedScript) return false;
            
            const isLatest = !script.name.includes('-v');
            const isCurrentlyDisplayedLatest = isLatest && script.name === currentlyDisplayedScript?.name;
            
            // Only filter out the latest version if it's currently displayed for this specific app
            // and no other version of this app is selected
            if (isCurrentlyDisplayedLatest && !selectedScript?.startsWith(baseName)) return false;
            
            return true;
        });

        // Sort versions with the latest (no -v tag) at the top, followed by other versions in descending order
        const sortedScriptsList = [...filteredScriptsList].sort((a, b) => {
            const isALatest = !a.name.includes('-v');
            const isBLatest = !b.name.includes('-v');
            
            if (isALatest) return -1;
            if (isBLatest) return 1;

            const versionA = parseInt(getBaseNameAndVersion(a.name).version || '0');
            const versionB = parseInt(getBaseNameAndVersion(b.name).version || '0');
            return versionB - versionA;
        });

        return (
            <VersionOverlay 
                style={style} 
                onDelete={handleDeleteVersion}
                onSelect={(versionName) => {
                    const selectedVersion = sortedScriptsList.find(script => script.name === versionName);
                    if (selectedVersion) {
                        handleSelectVersion(selectedVersion);
                    }
                }}
                openUpward={openUpward}
            >
                {sortedScriptsList.map(script => script.name)}
            </VersionOverlay>
        );
    };

    const formatTimestamp = (timestamp, script, category) => {
        if (!timestamp) return '';
        
        // Get all timestamps for all versions
        const allTimestamps = getLocalScriptTimestamps(category);
        const baseScriptName = getBaseName(script.name.replace(/ /g, ""));
        
        // Find the most recent timestamp among all versions
        let mostRecentTimestamp = timestamp;
        Object.entries(allTimestamps).forEach(([name, ts]) => {
            if (getBaseName(name.replace(/ /g, "")) === baseScriptName) {
                if (ts.timestamp.seconds > mostRecentTimestamp.seconds) {
                    mostRecentTimestamp = ts.timestamp;
                }
            }
        });
        
        const date = new Date(mostRecentTimestamp.seconds * 1000);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        } else if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        } else if (diffInDays < 7) {
            return `${diffInDays}d ago`;
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        }
    };

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
                            No scripts found.<br/>
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
                    const currentScript = currentVersion[category] && 
                        scriptsList.find(s => s.name === currentVersion[category].name) || 
                        scriptsList[0];
                    const hasMultipleVersions = scriptsList.length > 1;
                    
                    if (!cardRefs.current[currentScript.id]) {
                        cardRefs.current[currentScript.id] = React.createRef();
                    }

                    const { baseName: scriptBaseName, version } = getBaseNameAndVersion(currentScript.name);

                    return (
                        <motion.div
                            ref={cardRefs.current[currentScript.id]}
                            key={currentScript.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ 
                                y: -4,
                                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
                                borderColor: darkModeColors.primary,
                                transition: { duration: 0.2 }
                            }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => category === 'webApps' ? 
                                handlePlayScript(currentScript) : 
                                handleDownloadScript(currentScript)
                            }
                            style={{
                                ...styles.scriptCard,
                                borderColor: selectedScript === currentScript.name ? 
                                    darkModeColors.primary : 
                                    darkModeColors.border,
                            }}
                        >
                            <div style={styles.scriptCardHeader}>
                                {renameScriptId === currentScript.id ? (
                                    <input
                                        type="text"
                                        defaultValue={currentScript.name}
                                        onBlur={async (e) => 
                                            await handleRenameScript(category, currentScript.id, e.target.value)
                                        }
                                        style={styles.renameInput}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                ) : (
                                    <p style={{ ...styles.scriptName, fontSize: getFontSize(currentScript.name) }}>
                                        {scriptBaseName}
                                        {version && (
                                            <span style={styles.versionBadge}>
                                                v{version}
                                            </span>
                                        )}
                                    </p>
                                )}
                                <div style={styles.actions} onClick={(e) => e.stopPropagation()}>
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        {category === 'webApps' ? (
                                            <FaPlay 
                                                className="play-icon" 
                                                style={styles.playIcon} 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePlayScript(currentScript);
                                                }} 
                                            />
                                        ) : (
                                            <FaDownload 
                                                className="download-icon" 
                                                style={styles.playIcon}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownloadScript(currentScript);
                                                }} 
                                            />
                                        )}
                                    </motion.div>
                                    {category === 'webApps' ? (
                                        <motion.button 
                                            whileHover={{ scale: 1.05, backgroundColor: darkModeColors.secondary }}
                                            whileTap={{ scale: 0.95 }}
                                            style={styles.editButton} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditScript(currentScript);
                                            }}
                                        >
                                            Edit
                                        </motion.button>
                                    ) : (
                                        <motion.button 
                                            whileHover={{ scale: 1.05, backgroundColor: darkModeColors.secondary }}
                                            whileTap={{ scale: 0.95 }}
                                            style={styles.editButton} 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenScadViewer(currentScript);
                                            }}
                                        >
                                            Edit
                                        </motion.button>
                                    )}
                                    <motion.button 
                                        whileHover={{ scale: 1.05, backgroundColor: darkModeColors.secondary }}
                                        whileTap={{ scale: 0.95 }}
                                        style={styles.selectButton} 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectScript(currentScript);
                                        }}
                                    >
                                        Select
                                    </motion.button>
                                    <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <MdMoreVert
                                            className="more-icon"
                                            style={styles.moreIcon}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const menuHeight = 200; // Approximate height of menu
                                                const windowHeight = window.innerHeight;
                                                const spaceBelow = windowHeight - rect.bottom;
                                                const spaceAbove = rect.top;
                                                
                                                // Determine if menu should open upward or downward
                                                const openUpward = spaceBelow < menuHeight && spaceAbove > menuHeight;
                                                
                                                setMenuPosition({
                                                    top: openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8,
                                                    left: Math.min(rect.left, window.innerWidth - 160), // Use 160px (menu width) instead of 200
                                                    openUpward,
                                                });
                                                setActiveCard(currentScript.id);
                                            }}
                                        />
                                    </motion.div>
                                </div>
                            </div>
                            
                            <div style={styles.timestampContainer}>
                                <span style={styles.timestamp}>
                                    {formatTimestamp(
                                        getLocalScriptTimestamps(category)[currentScript.name]?.timestamp,
                                        currentScript,
                                        category
                                    )}
                                </span>
                            </div>

                            {activeCard === currentScript.id && menuPosition && (
                                <CardMenu style={{
                                    top: menuPosition.top,
                                    left: menuPosition.left,
                                    transformOrigin: menuPosition.openUpward ? 'bottom' : 'top',
                                }}>
                                    <p style={styles.cardMenuItem} 
                                       onClick={(e) => { 
                                           e.preventDefault();
                                           e.stopPropagation();
                                           setRenameScriptId(currentScript.id); 
                                           setActiveCard(null); 
                                           setMenuPosition(null);
                                       }}>
                                        Rename
                                    </p>
                                    <p style={styles.cardMenuItem} 
                                       onClick={(e) => { 
                                           e.stopPropagation();
                                           handleDownloadScript(currentScript); 
                                           setActiveCard(null); 
                                           setMenuPosition(null);
                                       }}>
                                        Download
                                    </p>
                                    {hasMultipleVersions && (
                                        <p style={styles.cardMenuItem} 
                                           onClick={(e) => { 
                                               e.stopPropagation();
                                               handleVersionButtonClick(baseName); 
                                               setActiveCard(null); 
                                               setMenuPosition(null);
                                           }}>
                                            Version
                                        </p>
                                    )}
                                    <div style={styles.menuDivider} />
                                    <p style={{
                                        ...styles.cardMenuItem,
                                        color: darkModeColors.danger,
                                        '&:hover': {
                                            backgroundColor: `${darkModeColors.danger}15`,
                                        },
                                    }} 
                                    onClick={(e) => { 
                                        e.stopPropagation();
                                        setDeleteConfirmation({ 
                                            show: true, 
                                            script: currentScript, 
                                            category: category,
                                            isDeleteAll: true
                                        });
                                        setActiveCard(null); 
                                        setMenuPosition(null);
                                    }}>
                                        <FaTrash style={{ marginRight: '8px' }} />
                                        Delete
                                    </p>
                                    {hasMultipleVersions && (
                                        <p style={{
                                            ...styles.cardMenuItem,
                                            color: darkModeColors.primary,
                                            '&:hover': {
                                                backgroundColor: `${darkModeColors.primary}15`,
                                            },
                                        }} 
                                        onClick={(e) => { 
                                            e.stopPropagation();
                                            setRevertConfirmation({ 
                                                show: true, 
                                                script: currentScript, 
                                                category: category 
                                            });
                                            setActiveCard(null); 
                                            setMenuPosition(null);
                                        }}>
                                            <FaUndo style={{ marginRight: '8px' }} />
                                            Revert
                                        </p>
                                    )}
                                </CardMenu>
                            )}
                            {versionOverlay === baseName && 
                                renderVersionOverlay(
                                    baseName, 
                                    scriptsList, 
                                    cardRefs.current[currentScript.id].current.getBoundingClientRect()
                                )}
                        </motion.div>
                    );
                })}
            </div>
        );
    };

    const handleClickOutside = (e) => {
        if (!e.target.closest('.card-menu') && !e.target.closest('.more-icon')) {
            setActiveCard(null);
            setMenuPosition(null);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Close version overlay if clicking outside
            if (versionOverlay && 
                !event.target.closest('.version-overlay') && 
                !event.target.closest('.card-menu')) {
                setVersionOverlay(null);
            }

            // Existing click outside handler for card menu
            if (!event.target.closest('.card-menu') && 
                !event.target.closest('.more-icon')) {
                setActiveCard(null);
                setMenuPosition(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [versionOverlay]); // Add versionOverlay to dependencies

    const scrollbarStyles = `
        * {
            scrollbar-width: thin;
            scrollbar-color: ${darkModeColors.primary} rgba(255, 255, 255, 0.05);
        }
        
        *::-webkit-scrollbar {
            width: 8px;
            background: transparent;
        }
        
        *::-webkit-scrollbar-thumb {
            background: ${darkModeColors.primary};
            border-radius: 4px;
        }
        
        *::-webkit-scrollbar-thumb:hover {
            background: ${darkModeColors.secondary};
        }
        
        *::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }
    `;

    useEffect(() => {
        const styleSheet = document.createElement("style");
        styleSheet.innerText = scrollbarStyles;
        document.head.appendChild(styleSheet);

        return () => {
            document.head.removeChild(styleSheet);
        };
    }, [scrollbarStyles]);

    useEffect(() => {
        const loadScripts = async () => {
            const userID = localStorage.getItem("userID");
            if (userID) {
                await syncLocalScriptsWithFirestore(userID, "webApps");
                await syncLocalScriptsWithFirestore(userID, "openSCAD");
                
                // Update local state with fresh data from localStorage
                const localWebApps = JSON.parse(localStorage.getItem("webApps")) || [];
                const localOpenSCAD = JSON.parse(localStorage.getItem("openSCAD")) || [];
                setScripts({
                    webApps: localWebApps,
                    openSCAD: localOpenSCAD,
                });
            }
        };

        loadScripts();
    }, [refreshTrigger]); // Add refreshTrigger as dependency

    const handleEditorClose = () => {
        setFullScreenEdit(null);
    };

    // Update the scripts update effect
    useEffect(() => {
        const handleScriptsUpdate = async (event) => {
            // Force update the scripts state with the latest data
            setScripts({
                webApps: JSON.parse(localStorage.getItem("webApps")) || [],
                openSCAD: JSON.parse(localStorage.getItem("openSCAD")) || []
            });
            
            // Increment refresh trigger to force re-render
            setRefreshTrigger(prev => prev + 1);
        };

        window.addEventListener('scriptsUpdated', handleScriptsUpdate);
        return () => {
            window.removeEventListener('scriptsUpdated', handleScriptsUpdate);
        };
    }, []);

    useEffect(() => {
        const userID = localStorage.getItem('userID');
        if (userID) {
            // Fetch timestamps for both script types
            getScriptTimestamps(userID, 'webApps');
            getScriptTimestamps(userID, 'openSCAD');
        }
    }, []);

    const getBaseNameAndVersion = (name) => {
        const versionMatch = name.match(/-v(\d+)$/);
        const version = versionMatch ? versionMatch[1] : null;
        const baseName = name.replace(/-v\d+$/, '');
        return { baseName, version };
    };

    const handleDeleteAllVersions = async (category, currentScript) => {
        setDeleteConfirmation({ show: false, script: null, category: null });
        
        const userID = localStorage.getItem("userID");
        const baseScriptName = getBaseNameAndVersion(currentScript.name).baseName;
        
        // Find all versions of this script
        const relatedScripts = scripts[category].filter(script => 
            getBaseNameAndVersion(script.name).baseName === baseScriptName
        );
        
        // Delete all versions from Firestore
        for (const script of relatedScripts) {
            await deleteScriptFromFirestore(userID, category, script.name);
        }
        
        // Update local state to remove all versions
        setScripts(prevState => ({
            ...prevState,
            [category]: prevState[category].filter(script => 
                getBaseNameAndVersion(script.name).baseName !== baseScriptName
            )
        }));
        
        // If any version was selected, clear selection
        if (relatedScripts.some(script => script.name === selectedScript)) {
            localStorage.removeItem("workingOnScript");
            setSelectedScript(null);
            setCurrentVersion((prevState) => ({ ...prevState, [category]: undefined }));
        }
        
        setActiveCard(null);
    };

    if (fullScreenEdit) {
        return (
            <FullScreenEditor
                script={fullScreenEdit}
                onClose={handleEditorClose}
                onSave={handleSaveFullScreenEdit}
            />
        );
    }

    return (
        <div style={styles.overlay} onClick={handleOverlayClick}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <Button
                        variant="text"
                        onClick={() => navigate("/")}
                        style={styles.backButton}
                        startIcon={
                            <motion.div
                                whileHover={{ x: -3 }}
                                whileTap={{ scale: 0.97 }}
                                style={{ color: darkModeColors.primary, display: 'flex', alignItems: 'center' }}
                            >
                                <FaArrowLeft />
                            </motion.div>
                        }
                    >
                        <motion.span
                            initial={{ opacity: 0.9 }}
                            whileHover={{ opacity: 1 }}
                            style={{ marginLeft: '4px' }}
                        >
                            BACK
                        </motion.span>
                    </Button>
                    <h2 style={styles.headerText}>Scripts</h2>
                </header>

                <AnimatePresence mode="wait">
                    {selectedScript && (
                        <motion.div 
                            style={styles.selectedScriptContainer}
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
                            transition={{ duration: 0.3 }}
                        >
                            <motion.div 
                                style={styles.selectedScript}
                                initial={{ scale: 0.95 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0.95, transition: { duration: 0.2 } }}
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
                                            onClick={() => {
                                                const script = scripts[activeTab].find(s => s.name === selectedScript);
                                                if (script) handleEditScript(script);
                                            }}
                                        >
                                            Edit
                                        </motion.button>
                                        <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <MdMoreVert
                                                className="more-icon"
                                                style={styles.selectedMoreIcon}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const menuHeight = 200;
                                                    const menuWidth = window.innerWidth <= 768 ? 160 : 140; // Account for mobile menu width
                                                    const windowHeight = window.innerHeight;
                                                    const windowWidth = window.innerWidth;
                                                    
                                                    // Calculate available space
                                                    const spaceBelow = windowHeight - rect.bottom;
                                                    const spaceAbove = rect.top;
                                                    const spaceRight = windowWidth - rect.left;
                                                    
                                                    // Determine if menu should open upward
                                                    const openUpward = spaceBelow < menuHeight && spaceAbove > menuHeight;
                                                    
                                                    // Calculate left position ensuring menu doesn't go off-screen
                                                    let leftPosition = rect.left;
                                                    if (leftPosition + menuWidth > windowWidth) {
                                                        leftPosition = windowWidth - menuWidth - 16; // 16px padding from edge
                                                    }
                                                    
                                                    setMenuPosition({
                                                        top: openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8,
                                                        left: leftPosition,
                                                        openUpward,
                                                    });
                                                    const script = scripts[activeTab].find(s => s.name === selectedScript);
                                                    if (script) setActiveCard(script.id);
                                                }}
                                            />
                                        </motion.div>
                                    </div>
                                </div>
                                <motion.div 
                                    style={styles.selectedScriptButtons}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <motion.button
                                        style={styles.deselectButton}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleDeselectScript}
                                    >
                                        Deselect Script
                                    </motion.button>
                                    <motion.button
                                        style={styles.launchButton}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleLaunchScript}
                                    >
                                        <FaPlay style={{ fontSize: '14px' }} />
                                        Launch Script
                                    </motion.button>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div style={styles.tabContainer}>
                    <div 
                        style={{
                            ...styles.tab,
                            ...(activeTab === 'webApps' ? styles.activeTab : {})
                        }}
                        onClick={() => setActiveTab('webApps')}
                    >
                        Web Apps
                    </div>
                    <div 
                        style={{
                            ...styles.tab,
                            ...(activeTab === 'openSCAD' ? styles.activeTab : {})
                        }}
                        onClick={() => setActiveTab('openSCAD')}
                    >
                        OpenSCAD
                    </div>
                </div>

                <div style={styles.searchSortContainer}>
                    <SearchBar 
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                    />
                    <SortButton />
                </div>

                <div style={styles.content}>
                    {activeTab === 'webApps' && (
                        <div style={styles.category}>
                            <div style={styles.addScript}>
                                <MdAdd style={styles.addScriptIcon} onClick={() => handleAddScriptClick("webApps")} />
                            </div>
                            <AddScriptOverlay 
                                isOpen={showAddForm.webApps}
                                onClose={() => handleCancelAddScript("webApps")}
                                onSave={() => handleSaveScript("webApps")}
                                category="webApps"
                            />
                            {renderScripts("webApps")}
                        </div>
                    )}

                    {activeTab === 'openSCAD' && (
                        <div style={styles.category}>
                            <div style={styles.addScript}>
                                <MdAdd style={styles.addScriptIcon} onClick={() => handleAddScriptClick("openSCAD")} />
                            </div>
                            <AddScriptOverlay 
                                isOpen={showAddForm.openSCAD}
                                onClose={() => handleCancelAddScript("openSCAD")}
                                onSave={() => handleSaveScript("openSCAD")}
                                category="openSCAD"
                            />
                            {renderScripts("openSCAD")}
                        </div>
                    )}
                </div>
            </div>
            <DeleteConfirmationOverlay
                isOpen={deleteConfirmation.show}
                onClose={() => setDeleteConfirmation({ show: false, script: null, category: null })}
                onConfirm={() => deleteConfirmation.isDeleteAll 
                    ? handleDeleteAllVersions(deleteConfirmation.category, deleteConfirmation.script)
                    : handleDeleteScript(deleteConfirmation.category, deleteConfirmation.script)
                }
                scriptName={deleteConfirmation.script?.name}
                isDeleteAll={deleteConfirmation.isDeleteAll}
            />
            <RevertConfirmationOverlay
                isOpen={revertConfirmation.show}
                onClose={() => setRevertConfirmation({ show: false, script: null, category: null })}
                onConfirm={() => {
                    handleDeleteScript(revertConfirmation.category, revertConfirmation.script);
                    setRevertConfirmation({ show: false, script: null, category: null });
                }}
                scriptName={getBaseNameAndVersion(revertConfirmation.script?.name || '').baseName}
                version={(() => {
                    if (!revertConfirmation.script) return '';
                    
                    // Find all versions of this script
                    const baseScriptName = getBaseNameAndVersion(revertConfirmation.script.name).baseName;
                    const relatedScripts = scripts[revertConfirmation.category]?.filter(script => 
                        getBaseNameAndVersion(script.name).baseName === baseScriptName
                    ) || [];
                    
                    // Find the highest version number
                    let highestVersion = 0;
                    relatedScripts.forEach(script => {
                        const { version } = getBaseNameAndVersion(script.name);
                        if (version && parseInt(version) > highestVersion) {
                            highestVersion = parseInt(version);
                        }
                    });
                    
                    return highestVersion.toString();
                })()}
            />
            {openScadViewer && (
                <OpenSCADViewer
                    script={openScadViewer}
                    onClose={() => setOpenScadViewer(null)}
                />
            )}
        </div>
    );
}

const styles = {
    overlay: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: darkModeColors.background,
        overflow: 'hidden',
        padding: 0,
    },
    container: {
        backgroundColor: darkModeColors.foreground,
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: darkModeColors.text,
        padding: '15px',
        position: 'sticky',
        top: 0,
        backgroundColor: darkModeColors.headerBackground,
        zIndex: 1000,
        borderBottom: `1px solid ${darkModeColors.border}`,
        flexShrink: 0,
    },
    headerText: {
        margin: 0,
        fontSize: '1.2em',
        fontWeight: 'bold',
    },
    backButton: {
        position: 'absolute',
        left: '15px',
        color: darkModeColors.text,
        fontWeight: '600',
        fontSize: '14px',
        padding: '8px 16px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
        },
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'auto',
        flexGrow: 1,
        width: '100%',
        padding: '20px',
        boxSizing: 'border-box',
    },
    selectedScriptContainer: {
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        flexShrink: 0,
        background: `linear-gradient(180deg, ${darkModeColors.headerBackground} 0%, transparent 100%)`,
    },
    selectedScript: {
        backgroundColor: darkModeColors.cardBackground,
        border: `1px solid ${darkModeColors.border}`,
        padding: '24px',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '100%',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    selectedScriptLabel: {
        color: darkModeColors.textSecondary,
        margin: 0,
        fontSize: '14px',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    selectedScriptName: {
        color: darkModeColors.primary,
        fontWeight: '600',
        fontSize: '24px',
        margin: 0,
        wordBreak: 'break-word',
    },
    selectedScriptButtons: {
        display: 'flex',
        gap: '12px',
        marginTop: '8px',
    },
    deselectButton: {
        backgroundColor: 'transparent',
        border: `2px solid ${darkModeColors.danger}`,
        color: darkModeColors.danger,
        padding: '10px 20px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
            backgroundColor: `${darkModeColors.danger}15`,
            transform: 'translateY(-2px)',
        },
    },
    launchButton: {
        backgroundColor: darkModeColors.primary,
        border: 'none',
        color: '#FFFFFF',
        padding: '10px 24px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        '&:hover': {
            backgroundColor: darkModeColors.secondary,
            transform: 'translateY(-2px)',
        },
    },
    category: {
        width: '100%',
        margin: '0',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
    },
    categoryTitle: {
        fontSize: '16px',
        fontWeight: '500',
        marginBottom: '16px',
        color: '#7289DA',
        textAlign: 'left',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    addScript: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '10px',
    },
    addScriptIcon: {
        fontSize: '24px',
        cursor: 'pointer',
        color: darkModeColors.textSecondary,
        transition: 'color 0.2s ease',
        '&:hover': {
            color: darkModeColors.primary,
        },
    },
    addScriptForm: {
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '20px',
        maxHeight: '60vh', // Limit maximum height
        overflowY: 'auto', // Enable vertical scrolling
        backgroundColor: darkModeColors.cardBackground,
        padding: '16px',
        borderRadius: '8px',
        border: `1px solid ${darkModeColors.border}`,
    },
    formActions: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '10px',
        position: 'sticky', // Keep buttons visible while scrolling
        bottom: 0,
        backgroundColor: darkModeColors.cardBackground,
        padding: '8px 0',
        marginTop: '8px',
    },
    saveScriptButton: {
        marginTop: '10px',
        backgroundColor: darkModeColors.primary,
    },
    cancelScriptButton: {
        marginTop: '10px',
        backgroundColor: darkModeColors.danger,
    },
    input: {
        marginBottom: '12px',
        padding: '12px',
        borderRadius: '4px',
        border: `1px solid ${darkModeColors.border}`,
        backgroundColor: darkModeColors.inputBackground,
        color: darkModeColors.text,
        outline: 'none',
        width: '100%',
        fontSize: '14px',
        minHeight: '40px', // Minimum height for inputs
        boxSizing: 'border-box',
        '&:focus': {
            borderColor: darkModeColors.primary,
        },
    },
    scriptCard: {
        backgroundColor: darkModeColors.cardBackground,
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: 'auto',
        minHeight: '140px',
        maxHeight: '180px',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        paddingBottom: '40px', // Add some padding at the bottom for the timestamp
    },
    scriptCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
        width: '100%',
    },
    scriptName: {
        color: darkModeColors.text,
        fontWeight: '600',
        margin: '0',
        width: '100%',
        paddingRight: '16px',
        boxSizing: 'border-box',
        transition: 'font-size 0.2s ease',
        wordWrap: 'break-word',
        whiteSpace: 'normal',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        lineHeight: '1.2',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '8px',
        position: 'absolute',
        bottom: '12px',
        right: '12px',
    },
    selectButton: {
        padding: '8px 16px',
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        borderRadius: '8px',
        cursor: 'pointer',
        border: 'none',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.2s ease',
    },
    playIcon: {
        fontSize: '22px',
        cursor: 'pointer',
        color: darkModeColors.primary,
        transition: 'transform 0.2s ease',
        '&:hover': {
            transform: 'scale(1.1)',
        },
    },
    moreIcon: {
        fontSize: '24px',
        cursor: 'pointer',
        color: darkModeColors.textSecondary,
        transition: 'color 0.2s ease',
        '&:hover': {
            color: darkModeColors.primary,
        },
    },
    cardMenu: {
        backgroundColor: darkModeColors.cardBackground,
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '12px',
        padding: '8px 0',
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: '0',
        zIndex: 9999,
        minWidth: '150px',
        maxWidth: '200px',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(10px)',
    },
    cardMenuItem: {
        color: darkModeColors.textSecondary,
        padding: '10px 16px',
        cursor: 'pointer',
        fontSize: '14px',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        userSelect: 'none',
        '&:hover': {
            backgroundColor: `${darkModeColors.primary}20`,
            color: darkModeColors.primary,
        },
    },
    renameInput: {
        border: '1px solid #444',
        borderRadius: '5px',
        backgroundColor: darkModeColors.foreground,
        color: darkModeColors.text,
        padding: '5px',
        outline: 'none',
    },
    editContent: {
        marginBottom: '10px',
        borderRadius: '5px',
        overflow: 'hidden',
        resize: 'vertical',
    },
    editActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
    },
    saveEditButton: {
        backgroundColor: darkModeColors.primary,
    },
    cancelEditButton: {
        backgroundColor: darkModeColors.border,
        color: darkModeColors.text,
    },
    versionOverlay: {
        backgroundColor: darkModeColors.foreground,
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
    },
    versionItem: {
        padding: '12px 16px',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        color: darkModeColors.text,
        transition: 'all 0.2s ease',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: `1px solid ${darkModeColors.border}`,
        '&:last-child': {
            borderBottom: 'none',
        },
        '&:hover': {
            backgroundColor: `${darkModeColors.primary}15`,
            paddingLeft: '20px',
        },
    },
    scriptsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
        width: '100%',
        padding: '16px',
        overflowY: 'auto',
        overflowX: 'hidden',
        flex: 1,
        boxSizing: 'border-box',
        '@media (min-width: 1200px)': {
            gridTemplateColumns: 'repeat(4, 1fr)', // Maximum 4 columns
        },
    },
    menuDivider: {
        height: '1px',
        backgroundColor: darkModeColors.border,
        margin: '4px 0',
    },
    tabContainer: {
        display: 'flex',
        padding: '0 20px',
        borderBottom: `1px solid ${darkModeColors.border}`,
        backgroundColor: darkModeColors.headerBackground,
        position: 'sticky',
        top: '64px',
        zIndex: 1000,
        justifyContent: 'center',
    },
    tab: {
        padding: '16px 32px',
        color: darkModeColors.textSecondary,
        cursor: 'pointer',
        fontSize: '16px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        position: 'relative',
        userSelect: 'none',
        '&:hover': {
            color: darkModeColors.text,
        },
    },
    activeTab: {
        color: darkModeColors.primary,
        '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-1px',
            left: 0,
            width: '100%',
            height: '2px',
            backgroundColor: darkModeColors.primary,
        },
    },
    noResults: {
        color: darkModeColors.textSecondary,
        textAlign: 'center',
        padding: '32px 16px',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
    },
    noResultsText: {
        fontSize: '16px',
        maxWidth: '300px',
        margin: '0 auto',
        lineHeight: '1.5',
        wordWrap: 'break-word',
    },
    editButton: {
        padding: '8px 16px',
        backgroundColor: '#4F545C', // A muted slate color that complements the theme
        color: darkModeColors.text,
        borderRadius: '8px',
        cursor: 'pointer',
        border: 'none',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.2s ease',
        marginRight: '8px',
    },
    searchSortContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '0 20px',
        marginTop: '16px',
        '@media (max-width: 400px)': {
            flexDirection: 'column',
            width: '100%',
            gap: '8px',
        },
    },
    sortButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: darkModeColors.cardBackground,
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '8px',
        cursor: 'pointer',
        color: darkModeColors.textSecondary,
        fontSize: '14px',
        transition: 'all 0.2s ease',
        width: '140px',
        flexShrink: 0,
        '&:hover': {
            backgroundColor: `${darkModeColors.primary}15`,
            borderColor: darkModeColors.primary,
            color: darkModeColors.primary,
        },
        '@media (max-width: 400px)': {
            width: '100%',
        },
    },
    sortIcon: {
        fontSize: '20px',
    },
    sortText: {
        fontWeight: '500',
    },
    timestampContainer: {
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    timestamp: {
        fontSize: '12px',
        color: darkModeColors.textSecondary,
        opacity: 0.8,
        fontWeight: '500',
    },
    selectedScriptHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        width: '100%',
    },
    selectedScriptActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    editSelectedButton: {
        backgroundColor: darkModeColors.cardBackground,
        border: `1px solid ${darkModeColors.border}`,
        color: darkModeColors.text,
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        '&:hover': {
            backgroundColor: `${darkModeColors.primary}15`,
            borderColor: darkModeColors.primary,
            color: darkModeColors.primary,
        },
    },
    selectedMoreIcon: {
        fontSize: '24px',
        cursor: 'pointer',
        color: darkModeColors.textSecondary,
        padding: '4px',
        borderRadius: '4px',
        transition: 'all 0.2s ease',
        '&:hover': {
            backgroundColor: `${darkModeColors.primary}15`,
            color: darkModeColors.primary,
        },
    },
    versionBadge: {
        backgroundColor: '#5865F2',
        color: '#FFFFFF',
        borderRadius: '4px',
        padding: '2px 6px',
        fontSize: '10px',
        marginLeft: '8px',
    },
};

export default ScriptsScreen;
