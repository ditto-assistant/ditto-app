import React, { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { MdAdd, MdMoreVert } from "react-icons/md";
import { FaPlay, FaArrowLeft } from "react-icons/fa"; // Add FaArrowLeft import
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
        if (script.scriptType === 'webApps') {
            setFullScreenEdit(script);
        } else {
            setEditScript(script);
            setTemporaryEditContent(script.content);
        }
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
        
        setFullScreenEdit(null);
    };

    const renderScripts = (category) => {
        const groupedScripts = getScriptsByBaseName(scripts[category]);
        return (
            <div style={styles.scriptsGrid}>
                {Object.keys(groupedScripts).map((baseName) => {
                    const scriptsList = groupedScripts[baseName];
                    const currentScript = currentVersion[category] && 
                        scriptsList.find(s => s.name === currentVersion[category].name) || 
                        scriptsList[0];
                    const hasMultipleVersions = scriptsList.length > 1;

                    return (
                        <div
                            key={currentScript.id}
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
                                    />
                                ) : (
                                    <p style={styles.scriptName}>{currentScript.name}</p>
                                )}
                                <div style={styles.actions}>
                                    <FaPlay 
                                        className="play-icon" 
                                        style={styles.playIcon} 
                                        onClick={() => handlePlayScript(currentScript)} 
                                    />
                                    <button 
                                        style={styles.selectButton} 
                                        onClick={() => handleSelectScript(currentScript)}
                                    >
                                        Select
                                    </button>
                                    <MdMoreVert
                                        className="more-icon"
                                        style={styles.moreIcon}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.target.getBoundingClientRect();
                                            setMenuPosition({
                                                top: rect.bottom + 8,
                                                left: rect.right - 200,
                                            });
                                            setActiveCard(currentScript.id);
                                        }}
                                    />
                                    {activeCard === currentScript.id && (
                                        <CardMenu style={{
                                            ...styles.cardMenu,
                                            top: menuPosition?.top,
                                            left: menuPosition?.left,
                                        }}>
                                            <p style={styles.cardMenuItem} 
                                               onClick={(e) => { 
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
                                                   handleEditScript(currentScript); 
                                                   setActiveCard(null); 
                                                   setMenuPosition(null);
                                               }}>
                                                Edit
                                            </p>
                                            <p style={styles.cardMenuItem} 
                                               onClick={(e) => { 
                                                   e.stopPropagation();
                                                   handleDeleteScript(category, currentScript); 
                                                   setActiveCard(null); 
                                                   setMenuPosition(null);
                                               }}>
                                                Delete
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
                                        </CardMenu>
                                    )}
                                </div>
                            </div>
                        </div>
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

    React.useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                        startIcon={<FaArrowLeft />}
                    >
                        BACK
                    </Button>
                    <h2 style={styles.headerText}>Scripts</h2>
                </header>
                <div style={styles.content}>
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

                    <div style={styles.category}>
                        <h4 style={styles.categoryTitle}>Web Apps</h4>
                        <div style={styles.addScript}>
                            <MdAdd style={styles.addScriptIcon} onClick={() => handleAddScriptClick("webApps")} />
                        </div>
                        {showAddForm.webApps && (
                            <div style={styles.addScriptForm}>
                                <input id="webApps-name-input" type="text" placeholder="Script Name" style={styles.input} />
                                <textarea id="webApps-content-input" placeholder="Script Content" style={styles.input} />
                                <div style={styles.formActions}>
                                    <Button
                                        variant="contained"
                                        style={styles.saveScriptButton}
                                        onClick={() => handleSaveScript("webApps")}
                                    >
                                        Save Script
                                    </Button>
                                    <Button
                                        variant="contained"
                                        style={styles.cancelScriptButton}
                                        onClick={() => handleCancelAddScript("webApps")}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                        {renderScripts("webApps")}
                    </div>

                    <div style={styles.category}>
                        <h4 style={styles.categoryTitle}>OpenSCAD</h4>
                        <div style={styles.addScript}>
                            <MdAdd style={styles.addScriptIcon} onClick={() => handleAddScriptClick("openSCAD")} />
                        </div>
                        {showAddForm.openSCAD && (
                            <div style={styles.addScriptForm}>
                                <input id="openSCAD-name-input" type="text" placeholder="Script Name" style={styles.input} />
                                <textarea id="openSCAD-content-input" placeholder="Script Content" style={styles.input} />
                                <div style={styles.formActions}>
                                    <Button
                                        variant="contained"
                                        style={styles.saveScriptButton}
                                        onClick={() => handleSaveScript("openSCAD")}
                                    >
                                        Save Script
                                    </Button>
                                    <Button
                                        variant="contained"
                                        style={styles.cancelScriptButton}
                                        onClick={() => handleCancelAddScript("openSCAD")}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                        {renderScripts("openSCAD")}
                    </div>
                </div>
            </div>
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
        color: darkModeColors.textSecondary,
        fontWeight: 'bold',
        '&:hover': {
            backgroundColor: 'transparent',
            color: darkModeColors.text,
        },
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
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
        color: darkModeColors.textSecondary,
        textAlign: 'left',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
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
    },
    formActions: {
        display: 'flex',
        justifyContent: 'space-between',
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
        transition: 'all 0.2s ease',
        height: '140px',
        cursor: 'pointer',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 12px rgba(0, 0, 0, 0.15)',
            borderColor: darkModeColors.primary,
        },
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
    },
    scriptCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px',
    },
    scriptName: {
        color: darkModeColors.text,
        fontSize: '16px',
        fontWeight: '600',
        margin: '0',
        maxWidth: '60%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: '8px',
        position: 'absolute',
        bottom: '16px',
        right: '16px',
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
        '&:hover': {
            backgroundColor: darkModeColors.secondary,
            transform: 'scale(1.05)',
        },
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
        position: 'absolute',
        top: 'calc(100% + 5px)',
        left: '0',
        width: '100%',
        backgroundColor: darkModeColors.foreground,
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '5px',
        zIndex: 1002,
        boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
        overflow: 'hidden',
    },
    versionItem: {
        padding: '10px',
        cursor: 'pointer',
        backgroundColor: darkModeColors.foreground,
        borderBottom: `1px solid ${darkModeColors.border}`,
        color: darkModeColors.text,
        ':hover': {
            backgroundColor: darkModeColors.primary,
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
    },
};

export default ScriptsScreen;
