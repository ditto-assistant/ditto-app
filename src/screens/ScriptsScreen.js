import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { MdAdd, MdMoreVert } from "react-icons/md";
import { FaPlay, FaArrowLeft, FaTrash, FaDownload } from "react-icons/fa"; // Add FaTrash and FaDownload import
import {
    deleteScriptFromFirestore,
    saveScriptToFirestore,
    renameScriptInFirestore,
} from "../control/firebase";
import { downloadOpenscadScript } from "../control/agentTools";
import { Button } from '@mui/material';
import FullScreenSpinner from "../components/LoadingSpinner";
import FullScreenEditor from '../components/FullScreenEditor';
import CardMenu from '../components/CardMenu';
import VersionOverlay from '../components/VersionOverlay';
import { motion } from 'framer-motion';
import DeleteConfirmationOverlay from '../components/DeleteConfirmationOverlay';
import SearchBar from '../components/SearchBar';
import AddScriptOverlay from '../components/AddScriptOverlay';
import OpenSCADViewer from '../components/OpenSCADViewer';

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

    const filterScripts = (scripts, searchTerm) => {
        if (!searchTerm) return scripts;
        
        const normalizedSearch = searchTerm.toLowerCase();
        return scripts.filter(script => {
            const baseName = getBaseName(script.name.replace(/ /g, "")).toLowerCase();
            return baseName.includes(normalizedSearch);
        });
    };

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
        
        // Proceed with deletion
        setScripts((prevState) => ({
            ...prevState,
            [category]: prevState[category].filter((script) => script.id !== currentScript.id),
        }));
        setActiveCard(null);
        const userID = localStorage.getItem("userID");
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

    const handleSaveEdit = (category, id) => {
        setScripts((prevState) => ({
            ...prevState,
            [category]: prevState[category].map((s) =>
                s.id === id ? { ...s, content: temporaryEditContent } : s
            ),
        }));
        setEditScript(null);
        const userID = localStorage.getItem("userID");
        saveScriptToFirestore(userID, temporaryEditContent, category, scripts[category].find((s) => s.id === id).name, true);
        // update working on script 
        const workingOnScript = JSON.parse(localStorage.getItem("workingOnScript"));
        if (workingOnScript && workingOnScript.script === scripts[category].find((s) => s.id === id).name) {
            localStorage.setItem("workingOnScript", JSON.stringify({ script: workingOnScript.script, contents: temporaryEditContent, scriptType: category }));
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
        
        // Update local state
        setScripts((prevState) => ({
            ...prevState,
            [category]: prevState[category].map((s) =>
                s.id === fullScreenEdit.id ? { ...s, content: newContent } : s
            ),
        }));
        
        // Save to Firestore
        await saveScriptToFirestore(userID, newContent, category, fullScreenEdit.name, true);
        
        // Update working script if this is the selected one
        if (selectedScript === fullScreenEdit.name) {
            localStorage.setItem("workingOnScript", JSON.stringify({
                script: fullScreenEdit.name,
                contents: newContent,
                scriptType: category
            }));
        }
        
        return Promise.resolve();
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
        const overlayHeight = Math.min(scriptsList.length * 40 + 16, 200); // Approximate height calculation
        const spaceBelow = windowHeight - cardRect.bottom;
        const spaceAbove = cardRect.top;
        
        // Determine if overlay should open upward
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
            const scriptToDelete = scriptsList[index];
            setDeleteConfirmation({ 
                show: true, 
                script: scriptToDelete, 
                category: scriptToDelete.scriptType 
            });
        };

        return (
            <VersionOverlay 
                style={style} 
                onDelete={handleDeleteVersion}
                onSelect={(versionName) => {
                    const selectedVersion = scriptsList.find(script => script.name === versionName);
                    if (selectedVersion) {
                        handleSelectVersion(selectedVersion);
                    }
                }}
                openUpward={openUpward}
            >
                {scriptsList.map((script) => script.name)}
            </VersionOverlay>
        );
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
                                        {currentScript.name}
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
                                            category: category 
                                        });
                                        setActiveCard(null); 
                                        setMenuPosition(null);
                                    }}>
                                        <FaTrash style={{ marginRight: '8px' }} />
                                        Delete
                                    </p>
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

    if (fullScreenEdit) {
        return (
            <FullScreenEditor
                script={fullScreenEdit}
                onClose={() => setFullScreenEdit(null)}
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

                {selectedScript && (
                    <div style={styles.selectedScriptContainer}>
                        <div style={styles.selectedScript}>
                            <p style={styles.selectedScriptLabel}>Currently Selected:</p>
                            <p style={styles.selectedScriptName}>{selectedScript}</p>
                            <div style={styles.selectedScriptButtons}>
                                <Button variant="contained" style={styles.deselectButton} onClick={handleDeselectScript}>
                                    Deselect Script
                                </Button>
                                <Button variant="contained" style={styles.launchButton} onClick={handleLaunchScript}>
                                    Launch Script
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

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

                <SearchBar 
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                />

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
                onConfirm={() => handleDeleteScript(deleteConfirmation.category, deleteConfirmation.script)}
                scriptName={deleteConfirmation.script?.name}
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
        marginBottom: '20px',
        flexShrink: 0,
    },
    selectedScript: {
        backgroundColor: darkModeColors.cardBackground,
        border: `1px solid ${darkModeColors.border}`,
        padding: '20px',
        borderRadius: '8px',
        textAlign: 'center',
        maxWidth: '600px',
        width: '100%',
        marginBottom: '24px',
    },
    selectedScriptLabel: {
        color: darkModeColors.text,
        marginBottom: '5px',
    },
    selectedScriptName: {
        color: darkModeColors.primary,
        fontWeight: 'bold',
        fontSize: '1.1em',
        marginBottom: '10px',
    },
    selectedScriptButtons: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
    },
    deselectButton: {
        backgroundColor: darkModeColors.danger,
        '&:hover': {
            backgroundColor: '#d04040',
        },
    },
    launchButton: {
        backgroundColor: darkModeColors.primary,
        '&:hover': {
            backgroundColor: '#5b6eae',
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
};

export default ScriptsScreen;
