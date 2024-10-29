import { FaBrain } from "react-icons/fa";
import { RiMagicLine } from "react-icons/ri";
import { FaPlay } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { downloadHTMLScript, downloadOpenscadScript } from "../control/agentTools";
import zIndex from "@mui/material/styles/zIndex";
import { motion } from "framer-motion";

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
            <motion.div 
                style={styles.iconItem} 
                onClick={handleBookmarkClick}
                whileHover={{ 
                    scale: 1.1,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }}
                whileTap={{ scale: 0.95 }}
            >
                <RiMagicLine style={styles.icon} />
            </motion.div>

            <motion.div 
                style={styles.iconItem} 
                onClick={handleMemoryClick}
                whileHover={{ 
                    scale: 1.1,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }}
                whileTap={{ scale: 0.95 }}
            >
                <FaBrain style={styles.icon} />
            </motion.div>

            {selectedScript && (
                <motion.div 
                    style={styles.iconItem} 
                    onClick={handlePlayScript}
                    whileHover={{ 
                        scale: 1.1,
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FaPlay style={styles.playIcon} />
                </motion.div>
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
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        transition: 'background-color 0.3s ease',
    },
    icon: {
        fontSize: '22px',
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