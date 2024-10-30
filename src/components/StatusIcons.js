import { FaBrain } from "react-icons/fa";
import { HiMiniDocument } from "react-icons/hi2";
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
        <div style={{
            display: 'flex',
            alignItems: 'center',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            gap: '24px',
            flexDirection: 'row'
        }}>
            <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    width: '40px',
                    height: '40px',
                    background: 'var(--dark-gray-2)',
                    borderRadius: '50%',
                    border: '1px solid var(--header-footer-border)'
                }}
                onClick={handleBookmarkClick}
            >
                <HiMiniDocument style={{ fontSize: '24px', color: darkModeColors.primary }} />
            </motion.div>

            <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    width: '40px',
                    height: '40px',
                    background: 'var(--dark-gray-2)',
                    borderRadius: '50%',
                    border: '1px solid var(--header-footer-border)'
                }}
                onClick={handleMemoryClick}
            >
                <FaBrain style={{ fontSize: '24px', color: darkModeColors.primary }} />
            </motion.div>

            {selectedScript && (
                <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        width: '40px',
                        height: '40px',
                        background: 'var(--dark-gray-2)',
                        borderRadius: '50%',
                        border: '1px solid var(--header-footer-border)'
                    }}
                    onClick={handlePlayScript}
                >
                    <FaPlay style={{ fontSize: '22px', color: darkModeColors.primary }} />
                </motion.div>
            )}

            {selectedScript && (
                <div className="selected-script-indicator">
                    <p className="focus-text">Focus: </p>
                    <p className="selected-script-text">{selectedScript}</p>
                </div>
            )}
        </div>
    );
}

export default StatusIcons;
