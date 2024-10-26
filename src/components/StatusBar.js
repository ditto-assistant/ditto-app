import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StatusIcons from "./StatusIcons";
import MemoryOverlay from "./MemoryOverlay";
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
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const [scripts, setScripts] = useState(() => {
        let webApps = JSON.parse(localStorage.getItem("webApps")) || [];
        let openSCAD = JSON.parse(localStorage.getItem("openSCAD")) || [];
        webApps.sort((a, b) => a.name.localeCompare(b.name));
        openSCAD.sort((a, b) => a.name.localeCompare(b.name));
        return { webApps, openSCAD };
    });

    const checkOnlineStatus = () => {
        setIsOnline(navigator.onLine);
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
                <div style={{
                    ...styles.statusIndicator,
                    backgroundColor: isOnline ? 'green' : 'red',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    marginRight: '6px'
                }}></div>
                <p style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</p>
            </div>

            <StatusIcons
                handleBookmarkClick={handleBookmarkClick}
                handleMemoryClick={handleMemoryClick}
                selectedScript={workingScript}
            />

            <div style={styles.balanceContainer} onClick={toggleBalanceDisplay}>
                <p style={styles.balanceIndicator}>
                    {balance.loading ? (
                        <LoadingSpinner size={14} inline={true} />
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
        padding: "4px 12px",
        backgroundColor: "#2f3136", // Discord-like dark background
        borderRadius: "12px",
        margin: "3px 8px",
    },
    status: {
        display: "flex",
        alignItems: "center",
        fontSize: "0.9em",
        cursor: "pointer",
    },
    statusText: {
        color: "#FFFFFF",
        margin: 0,
    },
    statusIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    balanceContainer: {
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
    },
    balanceIndicator: {
        backgroundColor: "#5865f2", // Discord-like blue
        color: "#FFFFFF",
        padding: "3px 8px",
        borderRadius: "10px",
        fontSize: "0.9em",
        fontWeight: "bold",
    },
};

export default StatusBar;
