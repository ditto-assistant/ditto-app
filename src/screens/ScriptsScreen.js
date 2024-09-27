import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MdAdd, MdMoreVert } from "react-icons/md";
import { FaPlay } from "react-icons/fa";
import {
    deleteScriptFromFirestore,
    saveScriptToFirestore,
    renameScriptInFirestore,
} from "../control/firebase";
import { downloadHTMLScript, downloadOpenscadScript } from "../control/agentTools";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/ext-language_tools";
import ace from "ace-builds/src-noconflict/ace";
import { Button } from '@mui/material';

ace.config.set("workerPath", "./");

const darkModeColors = {
    background: '#2C2F33',
    foreground: '#36393F',
    primary: '#7289DA',
    text: '#FFFFFF',
    border: '#4F545C',
    danger: '#F04747',
};

function ScriptsScreen() {
    const location = useLocation();
    const navigate = useNavigate();
    const [scripts, setScripts] = useState(location.state?.scripts || { webApps: [], openSCAD: [] });
    const [selectedScript, setSelectedScript] = useState(location.state?.selectedScript || null);
    const [activeCard, setActiveCard] = useState(null);
    const [renameScriptId, setRenameScriptId] = useState(null);
    const [editScript, setEditScript] = useState(null);
    const [temporaryEditContent, setTemporaryEditContent] = useState("");
    const [showAddForm, setShowAddForm] = useState({ webApps: false, openSCAD: false });
    const [versionOverlay, setVersionOverlay] = useState(null);
    const [currentVersion, setCurrentVersion] = useState({});

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

    const handleRenameScript = (category, id, newName) => {
        setScripts((prevState) => ({
            ...prevState,
            [category]: prevState[category].map((script) =>
                script.id === id ? { ...script, name: newName } : script
            ),
        }));
        const userID = localStorage.getItem("userID");
        const script = scripts[category].find((script) => script.id === id);
        renameScriptInFirestore(userID, category, script.name, newName);
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
            downloadHTMLScript(content, name);
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

    const getBaseName = (name) => {
        const match = name.match(/^[^\-]+/);
        let res = match ? match[0].replace(/([a-z])([A-Z])/g, '$1 $2').trim() : name;
        console.log("Name:", name);
        console.log("Base name:", res);
        return res
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
                                        onBlur={(e) => handleRenameScript(category, currentScript.id, e.target.value)}
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
                            {editScript === currentScript.id && (
                                <>
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
                                </>
                            )}
                            {versionOverlay === baseName && (
                                <div style={styles.versionOverlay}>
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
        <div style={styles.overlay}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <Button variant="contained" style={styles.backButton} onClick={() => navigate(-1)}>
                        Go Back
                    </Button>
                    <h2 style={styles.headerText}>Scripts</h2>
                </header>
                <div style={styles.content}>
                    {selectedScript && (
                        <div style={styles.selectedScript}>
                            <p style={{color: "white"}}>Currently Selected:</p>
                            <p style={{ color: darkModeColors.primary }}>{selectedScript}</p>
                            <Button variant="contained" style={styles.deselectButton} onClick={handleDeselectScript}>
                                Deselect Script
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
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: darkModeColors.background,
    },
    container: {
        backgroundColor: darkModeColors.foreground,
        borderRadius: '8px',
        textAlign: 'center',
        padding: '20px',
        width: '100%',
        maxWidth: '1000px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
    },
    header: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: darkModeColors.text,
        marginBottom: '20px',
        position: 'relative',
    },
    headerText: {
        flexGrow: 1,
        margin: 0,
        fontSize: '24px',
        textAlign: 'center',
    },
    backButton: {
        position: 'absolute',
        left: '0px',
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        marginLeft: '5px',
        padding: '5px 10px',
    },
    content: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
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