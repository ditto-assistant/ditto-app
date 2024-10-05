import React from "react";
// import { MdSettings } from "react-icons/md";
import { FaBrain } from "react-icons/fa";
import { HiMiniDocument } from "react-icons/hi2";

const darkModeColors = {
    primary: '#7289DA',
    text: '#FFFFFF',
};

function StatusIcons({ handleSettingsClick, handleBookmarkClick, handleMemoryClick, selectedScript }) {
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

            {selectedScript && (
                <div style={styles.selectedScriptIndicator}>
                    <p style={{ color: darkModeColors.primary }}>Focus: </p>
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