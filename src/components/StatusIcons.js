import { FaBrain } from "react-icons/fa";
import { FaLaptopCode } from "react-icons/fa";
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
                <FaLaptopCode style={styles.icon} />
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
    }
};

export default StatusIcons;