import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatusIcons from "./StatusIcons";
import MemoryOverlay from "./MemoryOverlay";
import { statusTemp } from "../control/status";
import { syncLocalScriptsWithFirestore } from "../control/firebase";
import { useBalance } from "../hooks/useBalance";
import { LoadingSpinner } from "./LoadingSpinner";

function StatusBar() {
    const navigate = useNavigate();
    const balance = useBalance();
    const [isMemoryOverlayOpen, setIsMemoryOverlayOpen] = useState(false);
    const [workingScript, setWorkingScript] = useState(() => {
        const storedScript = localStorage.getItem("workingOnScript");
        return storedScript ? JSON.parse(storedScript).script : null;
    });
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
                selectedScript: workingScript
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

    // Update working script when localStorage changes
    useEffect(() => {
        syncLocalScripts();
        const handleStorageChange = (e) => {
            if (e.key === "workingOnScript") {
                const newScript = e.newValue ? JSON.parse(e.newValue).script : null;
                syncLocalScripts().then(() => {
                    setWorkingScript(newScript);
                });
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

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
                selectedScript={workingScript}
            />

            <div style={styles.status} onClick={toggleBalanceDisplay}>
                <p style={styles.statusIndicator}>
                    {balance.loading ? (
                        <LoadingSpinner size={19} inline={true} />
                    ) : (
                        showUSD ? balance.usd : balance.balance
                    )}
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
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
};

export default StatusBar;
