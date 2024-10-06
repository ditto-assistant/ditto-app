import { FaBrain } from "react-icons/fa";
import { HiMiniDocument } from "react-icons/hi2";
import { FaPlay } from "react-icons/fa";
import { downloadHTMLScript, downloadOpenscadScript } from "../control/agentTools";

const darkModeColors = {
    primary: '#7289DA',
    text: '#FFFFFF',
};

function StatusIcons({ handleSettingsClick, handleBookmarkClick, handleMemoryClick, selectedScript }) {

    const handlePlayScript = () => {
        try {
            let workingOnScript = JSON.parse(localStorage.getItem("workingOnScript"));
            let scriptType = workingOnScript.scriptType;
            let content = workingOnScript.contents;
            let name = workingOnScript.script;
            if (scriptType === "webApps") {
                downloadHTMLScript(content, name);
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
            {/* <div style={styles.iconItem} onClick={handleSettingsClick}>
                <MdSettings style={styles.icon} />
            </div> */}

            <div style={styles.iconItem} onClick={handleBookmarkClick}>
                <HiMiniDocument style={styles.icon} />
            </div>

            <div style={styles.iconItem} onClick={handleMemoryClick}>
                <FaBrain style={styles.icon} />
            </div>
            
            {/* Below is the Focus Overlay */}
            {selectedScript && (
                <div style={styles.selectedScriptIndicator}>
                    <p style={{ color: darkModeColors.primary }}>Focus: </p>
                    <p style={styles.selectedScriptText}>{selectedScript}</p>
                    <FaPlay style={styles.playIcon} onClick={() => handlePlayScript()} />
                </div>
            )}

        </div>
    );
}

const styles = {
    icons: {
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
    },
    iconItem: {
        marginLeft: '10px',
        cursor: 'pointer',
        position: 'relative',
    },
    icon: {
        fontSize: '24px',
        color: darkModeColors.primary,
    },
    playIcon: {
        fontSize: '20px',
        cursor: 'pointer',
        color: darkModeColors.primary,
        marginRight: '10px',
        // move it down a bit to align with the text
        marginTop: '18px',
        marginLeft: '10px',
    },
    selectedScriptIndicator: {
        color: darkModeColors.text,
        fontWeight: 'bold',
        marginLeft: '10px',
        position: 'absolute',
        // bring to top
        zIndex: 1,
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        top: '80px',
        // backgroundColor: darkModeColors.foreground,
        // make the background color the same as the chat bubble
        backgroundColor: '#36393f',
        padding: '0px 10px',
        borderRadius: '5px',
        whiteSpace: 'nowrap',
        display: 'flex',
        flexDirection: 'row',
    },
    selectedScriptText: {
        margin: 0,
        paddingTop: '16px',
    },
};

export default StatusIcons;