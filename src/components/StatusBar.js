import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatusIcons from "./StatusIcons";
import MemoryOverlay from "./MemoryOverlay";
import { statusTemp } from "../control/status";
import { syncLocalScriptsWithFirestore } from "../control/firebase";

function StatusBar() {
    const navigate = useNavigate();
    let userID = localStorage.getItem("userID");
    const balance = Number(localStorage.getItem(`${userID}_balance`)) || 0;
    const tokensLeftInput = (balance / 0.6) * 1000000;
    const tokensLeftOutput = (balance / 2.4) * 1000000;
    const totalTokens = tokensLeftInput + tokensLeftOutput;
    const [tokensLeft, setTokensLeft] = useState(totalTokens);
    const [isMemoryOverlayOpen, setIsMemoryOverlayOpen] = useState(false);
    const [selectedScript, setSelectedScript] = useState(
        localStorage.getItem("workingOnScript") ? JSON.parse(localStorage.getItem("workingOnScript")).script : null
    );

    const [scripts, setScripts] = useState(() => {
        let webApps = JSON.parse(localStorage.getItem("webApps")) || [];
        let openSCAD = JSON.parse(localStorage.getItem("openSCAD")) || [];
        webApps.sort((a, b) => a.name.localeCompare(b.name));
        openSCAD.sort((a, b) => a.name.localeCompare(b.name));
        return { webApps, openSCAD };
    });

    const handleSettingsClick = () => {
        navigate("/settings");
    };

    const handleBookmarkClick = async () => {
        let webApps = JSON.parse(localStorage.getItem("webApps")) || [];
        let openSCAD = JSON.parse(localStorage.getItem("openSCAD")) || [];
        // sort them
        webApps.sort((a, b) => a.name.localeCompare(b.name));
        openSCAD.sort((a, b) => a.name.localeCompare(b.name));
        let scriptsLocal = { webApps, openSCAD };
        setScripts(scriptsLocal);
        navigate("/scripts", { 
            state: { 
                scripts: scripts,
                selectedScript: selectedScript 
            } 
        });
    };

    const handleMemoryClick = () => {
        setIsMemoryOverlayOpen(!isMemoryOverlayOpen);
    };

    const syncLocalScripts = async () => {
        let userID = localStorage.getItem('userID');
        await syncLocalScriptsWithFirestore(userID, "webApps");
        await syncLocalScriptsWithFirestore(userID, "openScad");
        let webApps = JSON.parse(localStorage.getItem("webApps")) || [];
        let openSCAD = JSON.parse(localStorage.getItem("openSCAD")) || [];
        webApps.sort((a, b) => a.name.localeCompare(b.name));
        openSCAD.sort((a, b) => a.name.localeCompare(b.name));
        setScripts({ webApps, openSCAD });
    }

    // sync local scripts on mount
    useEffect(() => {
        syncLocalScripts();
        setSelectedScript(localStorage.getItem("workingOnScript") ? JSON.parse(localStorage.getItem("workingOnScript")).script : null);
    }, [localStorage.getItem("workingOnScript")]);

    useEffect(() => {
        let webApps = scripts.webApps;
        let openSCAD = scripts.openSCAD;
        localStorage.setItem("webApps", JSON.stringify(webApps));
        localStorage.setItem("openSCAD", JSON.stringify(openSCAD));
    }, [scripts]);

    const formatNumber = (num) => {
        if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
        if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
        return num.toString();
    };

    useEffect(() => {
        let userID = localStorage.getItem("userID");
        const balance = Number(localStorage.getItem(`${userID}_balance`)) || 0;
        const tokensLeftInput = (balance / 0.6) * 1000000;
        const tokensLeftOutput = (balance / 2.4) * 1000000;
        const totalTokens = tokensLeftInput + tokensLeftOutput;
        setTokensLeft(totalTokens);
    }, [balance]);

    return (
        <div style={styles.statusBar}>
            <div style={styles.status}>
                <p style={styles.statusText}>Status:</p>
                <p style={styles.statusIndicator}>{statusTemp.status}</p>
            </div>

            <StatusIcons
                // handleSettingsClick={handleSettingsClick}
                handleBookmarkClick={handleBookmarkClick}
                handleMemoryClick={handleMemoryClick}
                selectedScript={selectedScript}
            />

            <div style={styles.status}>
                <p style={styles.statusText}>Tokens:</p>
                <p style={styles.statusIndicator}>{formatNumber(totalTokens)}</p>
            </div>

            {isMemoryOverlayOpen && (
                <MemoryOverlay
                    closeOverlay={() => setIsMemoryOverlayOpen(false)}
                />
            )}
        </div>
    );
}

const styles = {
    statusBar: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px",
    },
    status: {
        display: "flex",
        alignItems: "center",
        paddingLeft: "20px",
        paddingRight: "20px",
        fontSize: "1.0em",
    },
    statusText: {
        // paddingRight: "2px",
        color: "#FFFFFF",
    },
    statusIndicator: {
        color: "green",
    },
};

export default StatusBar;