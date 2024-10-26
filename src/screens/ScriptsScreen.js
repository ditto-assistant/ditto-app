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

const darkModeColors = {
    background: '#2C2F33',
    foreground: '#36393F',
    primary: '#7289DA',
    text: '#FFFFFF',
    border: '#4F545C',
    danger: '#F04747',
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
        setTemporaryEditContent(script.content);
        setEditScript(script.id);
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

    const renderScripts = (category) => {
        const groupedScripts = getScriptsByBaseName(scripts[category]);
        return (
            <>
                {Object.keys(groupedScripts).map((baseName) => {
                    const scriptsList = groupedScripts[baseName];
                    const currentScript = currentVersion[category] && scriptsList.find(s => s.name === currentVersion[category].name) || scriptsList[0];
                    const hasMultipleVersions = scriptsList.length > 1;

                    return (
                        <div
                            key={currentScript.id}
                            style={{
                                ...styles.scriptCard,
                                borderColor: selectedScript === currentScript.name ? darkModeColors.primary : darkModeColors.border,
                            }}
                        >
                            <div style={styles.scriptCardHeader}>
                                {renameScriptId === currentScript.id ? (
                                    <input
                                        type="text"
                                        defaultValue={currentScript.name}
                                        onBlur={async (e) => await handleRenameScript(category, currentScript.id, e.target.value)}
                                        style={styles.renameInput}
                                        autoFocus
                                    />
                                ) : (
                                    <p style={styles.scriptName}>{currentScript.name}</p>
                                )}
                                <div style={styles.actions}>
                                    <FaPlay className="play-icon" style={styles.playIcon} onClick={() => handlePlayScript(currentScript)} />
                                    <button style={styles.selectButton} onClick={() => handleSelectScript(currentScript)}>
                                        Select
                                    </button>
                                    <MdMoreVert
                                        className="more-icon"
                                        style={styles.moreIcon}
                                        onClick={() => {
                                            setActiveCard(currentScript.id);
                                        }}
                                    />
                                    {activeCard === currentScript.id && (
                                        <div
                                            className="card-menu"
                                            style={styles.cardMenu}
                                        >
                                            <p style={styles.cardMenuItem} onClick={() => { setRenameScriptId(currentScript.id); setActiveCard(null); }}>Rename</p>
                                            <p style={styles.cardMenuItem} onClick={() => { handleEditScript(currentScript); setActiveCard(null); }}>Edit</p>
                                            <p style={styles.cardMenuItem} onClick={() => { handleDeleteScript(category, currentScript); setActiveCard(null); }}>
                                                Delete
                                            </p>
                                            <p style={styles.cardMenuItem} onClick={() => { handleDownloadScript(currentScript); setActiveCard(null); }}>Download</p>
                                            {hasMultipleVersions && (
                                                <p style={styles.cardMenuItem} onClick={() => { handleVersionButtonClick(baseName); setActiveCard(null); }}>Version</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {editScript === currentScript.id && aceLoaded && (
                                <Suspense fallback={<FullScreenSpinner />}>
                                    <AceEditor
                                        mode="javascript"
                                        theme="monokai"
                                        name={`editor-${currentScript.id}`}
                                        width="100%"
                                        height="300px"
                                        value={temporaryEditContent}
                                        onChange={setTemporaryEditContent}
                                        fontSize={14}
                                        showPrintMargin={false}
                                        showGutter={true}
                                        highlightActiveLine={true}
                                        setOptions={{
                                            enableBasicAutocompletion: true,
                                            enableLiveAutocompletion: true,
                                            enableSnippets: true,
                                            showLineNumbers: true,
                                            tabSize: 2,
                                            useWorker: false,
                                            wrap: true,
                                        }}
                                        editorProps={{ $blockScrolling: true }}
                                        style={styles.editContent}
                                    />
                                    <div style={styles.editActions}>
                                        <Button
                                            variant="contained"
                                            style={styles.saveEditButton}
                                            onClick={() => handleSaveEdit(category, currentScript.id)}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            variant="contained"
                                            style={styles.cancelEditButton}
                                            onClick={handleCancelEditScript}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </Suspense>
                            )}
                            {versionOverlay === baseName && (
                                <div style={styles.versionOverlay} ref={versionOverlayRef}>
                                    {scriptsList.map((version) => (
                                        <p key={version.id} style={styles.versionItem} onClick={() => handleSelectVersion(version)}>
                                            {version.name}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </>
        );
    };

    const handleClickOutside = (e) => {
        if (!e.target.closest('.card-menu') && !e.target.closest('.more-icon')) {
            setActiveCard(null);
        }
    };

    React.useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                        <div style={styles.selectedScript}>
                            <p style={{ color: "white" }}>Currently Selected:</p>
                            <p style={{ color: darkModeColors.primary }}>{selectedScript}</p>
                            <Button variant="contained" style={styles.deselectButton} onClick={handleDeselectScript}>
                                Deselect Script
                            </Button>
                            <Button variant="contained" style={styles.launchButton} onClick={handleLaunchScript}>
                                Launch Script
                            </Button>
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
        backgroundColor: darkModeColors.background,
        overflowY: 'auto',
        padding: 0, // Remove padding
    },
    container: {
        backgroundColor: darkModeColors.foreground,
        textAlign: 'center',
        width: '100%',
        maxWidth: '100%', // Ensure it takes full width
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
        height: '100vh', // Full viewport height
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: darkModeColors.text,
        padding: '15px',
        position: 'sticky',
        top: 0,
        backgroundColor: '#2f3136',
        zIndex: 1000,
        borderRadius: '8px 8px 0 0',
    },
    headerText: {
        margin: 0,
        fontSize: '1.2em',
        fontWeight: 'bold',
    },
    backButton: {
        position: 'absolute',
        left: '15px',
        color: '#7289da',
        fontWeight: 'bold',
        '&:hover': {
            backgroundColor: 'transparent',
            color: '#5b6eae',
        },
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        overflowY: 'auto',
        flexGrow: 1,
        padding: '0 20px 20px 20px', // Add padding to the content area
    },
    selectedScript: {
        backgroundColor: 'rgba(54, 57, 63, 0.8)',
        border: `1px solid ${darkModeColors.border}`,
        padding: '10px',
        borderRadius: '5px',
        textAlign: 'center',
        marginBottom: '20px',
    },
    deselectButton: {
        marginTop: '10px',
        backgroundColor: darkModeColors.danger,
    },
    launchButton: {
        marginTop: '10px',
        marginLeft: '10px',
        backgroundColor: darkModeColors.primary,
    },
    category: {
        marginBottom: '20px',
        width: '100%',
    },
    categoryTitle: {
        fontSize: '20px',
        marginBottom: '10px',
        color: darkModeColors.text,
    },
    addScript: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '10px',
    },
    addScriptIcon: {
        fontSize: '24px',
        cursor: 'pointer',
        color: darkModeColors.primary,
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
        marginBottom: '10px',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #444',
        backgroundColor: darkModeColors.foreground,
        color: darkModeColors.text,
        outline: 'none',
        width: '100%',
    },
    scriptCard: {
        backgroundColor: darkModeColors.foreground,
        border: `1px solid ${darkModeColors.border}`,
        borderRadius: '5px',
        padding: '10px',
        marginBottom: '10px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
    },
    scriptCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scriptName: {
        color: darkModeColors.text,
        fontSize: '16px',
        marginBottom: '16px',
        fontWeight: '500',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        position: 'relative',
    },
    selectButton: {
        padding: '5px 10px',
        marginLeft: '10px',
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        borderRadius: '5px',
        cursor: 'pointer',
        border: 'none',
    },
    playIcon: {
        fontSize: '20px',
        cursor: 'pointer',
        color: darkModeColors.primary,
        marginRight: '10px',
    },
    moreIcon: {
        fontSize: '24px',
        cursor: 'pointer',
        color: darkModeColors.primary,
        position: 'relative',
    },
    cardMenu: {
        backgroundColor: darkModeColors.foreground,
        border: `1px solid ${darkModeColors.primary}`,
        borderRadius: '5px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        top: 'calc(100% + 5px)',
        right: '0',
        zIndex: 1001,
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
    },
    cardMenuItem: {
        color: darkModeColors.text,
        marginBottom: '8px',
        cursor: 'pointer',
        ':last-child': {
            marginBottom: '0',
        },
        ':hover': {
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
};

export default ScriptsScreen;
