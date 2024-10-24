import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatusIcons from "./StatusIcons";
import MemoryOverlay from "./MemoryOverlay";
import { statusTemp } from "../control/status";
import { syncLocalScriptsWithFirestore } from "../control/firebase";
import { useBalanceContext } from '../App';

function StatusBar() {
    const navigate = useNavigate();
    const balance = useBalanceContext();
    const [isMemoryOverlayOpen, setIsMemoryOverlayOpen] = useState(false);
    const [selectedScript, setSelectedScript] = useState(
        localStorage.getItem("workingOnScript") ? JSON.parse(localStorage.getItem("workingOnScript")).script : null
    );
    const [showUSD, setShowUSD] = useState(() => {
        let savedMode = localStorage.getItem("status_bar_fiat_balance");
        if (savedMode == null) {
            savedMode = 't';
            localStorage.setItem("status_bar_fiat_balance", savedMode);
        }
        return savedMode === 't';
    });

    const [scripts, setScripts] = useState(() => {
        let webApps = JSON.parse(localStorage.getItem("webApps")) || [];
        let openSCAD = JSON.parse(localStorage.getItem("openSCAD")) || [];
        webApps.sort((a, b) => a.name.localeCompare(b.name));
        openSCAD.sort((a, b) => a.name.localeCompare(b.name));
        return { webApps, openSCAD };
    });

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

    const toggleBalanceDisplay = () => {
        const newShowUSD = !showUSD;
        setShowUSD(newShowUSD);
        localStorage.setItem("status_bar_fiat_balance", newShowUSD ? 't' : 'f');
    };

    return (
        <div style={styles.statusBar}>
            <div style={styles.status}>
                {/* <p style={styles.statusText}>Status:</p> */}
                <p style={styles.statusIndicator}>{statusTemp.status}</p>
            </div>

            <StatusIcons
                handleBookmarkClick={handleBookmarkClick}
                handleMemoryClick={handleMemoryClick}
                selectedScript={selectedScript}
            />

            <div style={styles.status} onClick={toggleBalanceDisplay}>
                {/* <p style={styles.statusText}>Balance:</p> */}
                <p style={styles.statusIndicator}>
                    {showUSD ? balance.usd : balance.balance}
                </p>
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
        cursor: "pointer",
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