import { FaBrain } from "react-icons/fa";
import { HiMiniDocument } from "react-icons/hi2";
import { FaPlay } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { downloadHTMLScript, downloadOpenscadScript } from "../control/agentTools";
import zIndex from "@mui/material/styles/zIndex";

const darkModeColors = {
    primary: '#7289DA',
    text: '#FFFFFF',
};

function StatusIcons({ handleBookmarkClick, handleMemoryClick, selectedScript }) {
    const navigate = useNavigate();

    const handlePlayScript = () => {
        try {
            let workingOnScript = JSON.parse(localStorage.getItem("workingOnScript"));
            let scriptType = workingOnScript.scriptType;
            let content = workingOnScript.contents;
            let name = workingOnScript.script;
            if (scriptType === "webApps") {
                // downloadHTMLScript(content, name);
                navigate("/canvas", { state: { script: content, scriptName: name } });
            } else if (scriptType === "openSCAD") {
                downloadOpenscadScript(content, name);
            }
        }
        catch (error) {
            console.error("Error playing script:", error);
        }
    };

    return (
        <div style={styles.icons}>
            <div style={styles.iconItem} onClick={handleBookmarkClick}>
                <HiMiniDocument style={styles.icon} />
            </div>

            <div style={styles.iconItem} onClick={handleMemoryClick}>
                <FaBrain style={styles.icon} />
            </div>

            {selectedScript && (
                <div style={styles.iconItem} onClick={handlePlayScript}>
                    <FaPlay style={styles.playIcon} />
                </div>
            )}

            {selectedScript && (
                <div style={styles.selectedScriptIndicator}>
                    <p style={{ color: darkModeColors.primary, fontSize: '0.9em' }}>Focus: </p>
                    <p style={styles.selectedScriptText}>{selectedScript}</p>
                </div>
            )}

        </div>
    );
}

const styles = {
    icons: {
        display: 'flex',
        alignItems: 'center',
        position: 'absolute',
        justifyContent: 'center',
        left: '50%',
        zIndex: 3000,
        transform: 'translateX(-50%)',
    },
    iconItem: {
        margin: '0px 3px',
        cursor: 'pointer',
        position: 'relative',
    },
    icon: {
        fontSize: '24px',
        color: darkModeColors.primary,
    },
    playIcon: {
        fontSize: '22px',
        color: darkModeColors.primary,
    },
    selectedScriptIndicator: {
        color: darkModeColors.text,
        fontWeight: 'bold',
        position: 'absolute',
        zIndex: 3000,
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        top: '74px',
        backgroundColor: '#36393f',
        padding: '0px 10px',
        borderRadius: '5px',
        whiteSpace: 'nowrap',
        flexDirection: 'row',
    },
    selectedScriptText: {
        fontSize: '0.9em',
        margin: 0,
        paddingTop: '1.0em',
    },
};

export default StatusIcons;