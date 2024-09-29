import React, { useState, useEffect, useRef } from "react";
import { MdClose } from "react-icons/md";

import { resetConversation, deleteAllUserImagesFromFirebaseStorageBucket } from "../control/firebase";

const darkModeColors = {
    primary: '#7289DA',
    text: '#FFFFFF',
    foreground: '#23272A',
};

function MemoryOverlay({ closeOverlay }) {
    const overlayContentRef = useRef(null); 

    const [memoryStatus, setMemoryStatus] = useState({
        longTerm: JSON.parse(localStorage.getItem("deactivateLongTermMemory")) || false,
        shortTerm: JSON.parse(localStorage.getItem("deactivateShortTermMemory")) || false,
    });

    useEffect(() => { // handle click outside of overlay to close
        const handleClickOutside = (event) => {
            if (overlayContentRef.current && !overlayContentRef.current.contains(event.target)) {
                closeOverlay();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [overlayContentRef, closeOverlay]);

    const toggleMemoryActivation = (memoryType) => {
        setMemoryStatus((prev) => {
            const newStatus = !prev[memoryType];
            if (memoryType === "longTerm") {
                localStorage.setItem("deactivateLongTermMemory", newStatus);
                if (!newStatus) {
                    localStorage.removeItem("longTermMemory");
                }
            } else if (memoryType === "shortTerm") {
                localStorage.setItem("deactivateShortTermMemory", newStatus);
                if (!newStatus) {
                    localStorage.removeItem("shortTermMemory");
                }
            }
            return {
                ...prev,
                [memoryType]: newStatus,
            };
        });
        console.log(`Deactivate ${memoryType} memory: ${memoryStatus[memoryType]}`);
    };

    const deleteAllMemory = async() => {
        const confirmReset = window.confirm(
            "Are you sure you want to delete all memory? This action cannot be undone."
          );
          if (confirmReset) {
            console.log("Resetting conversation history...");
            localStorage.setItem("resetMemory", "true");
            const userID = localStorage.getItem("userID");
            localStorage.removeItem("prompts");
            localStorage.removeItem("responses");
            localStorage.removeItem("histCount");
            await resetConversation(userID);
            await deleteAllUserImagesFromFirebaseStorageBucket(userID);
          }
    }

    return (
        <div style={styles.overlay}>
            <div ref={overlayContentRef} style={{ ...styles.overlayContent, width: '40%', margin: '0 auto' }}>
                <div style={styles.overlayHeader}>
                    <h3 style={{ ...styles.overlayHeaderText, margin: '0 auto' }}>Memory</h3>
                    <MdClose style={styles.closeIcon} onClick={closeOverlay} />
                </div>
                <div style={{ ...styles.category, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={{ ...styles.categoryTitle, marginBottom: '20px' }}>
                        Long Term Memory
                        <span style={memoryStatus.longTerm ? styles.inactiveIndicator : styles.activeIndicator} />
                    </h4>
                    <div style={styles.memoryActions}>
                        <button
                            style={styles.memoryButton}
                            onClick={() => toggleMemoryActivation("longTerm")}
                        >
                            {memoryStatus.longTerm ? "Activate" : "Deactivate"}
                        </button>
                    </div>
                </div>
                <div style={{ ...styles.category, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={styles.categoryTitle}>
                        Short Term Memory
                        <span style={memoryStatus.shortTerm ? styles.inactiveIndicator : styles.activeIndicator} />
                    </h4>
                    <div style={styles.memoryActions}>
                        <button
                            style={styles.memoryButton}
                            onClick={() => toggleMemoryActivation("shortTerm")}
                        >
                            {memoryStatus.shortTerm ? "Activate" : "Deactivate"}
                        </button>
                    </div>
                </div>
                <div style={{ ...styles.category, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h4 style={styles.categoryTitle}>
                        Memory Manager
                    </h4>
                    <div style={styles.memoryActions}>
                        <button
                            style={styles.memoryDeleteButton}
                            onClick={() => deleteAllMemory()}
                        >
                            Delete All Memory
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    overlayContent: {
        backgroundColor: darkModeColors.foreground,
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        width: '40%',
        maxHeight: '80%',
        overflowY: 'auto',
        color: darkModeColors.text,
    },
    overlayHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    overlayHeaderText: {
        margin: 0,
    },
    closeIcon: {
        fontSize: '24px',
        cursor: 'pointer',
        color: darkModeColors.primary,
    },
    category: {
        marginBottom: '20px',
    },
    categoryTitle: {
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
    },
    activeIndicator: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: 'green',
        marginLeft: '8px',
    },
    inactiveIndicator: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: 'red',
        marginLeft: '8px',
    },
    memoryActions: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: '10px',
    },
    memoryButton: {
        padding: '10px',
        backgroundColor: darkModeColors.primary,
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        flex: 1,
        marginRight: '5px',
    },
    memoryDeleteButton: {
        padding: '10px',
        backgroundColor: '#D32F2F',
        color: darkModeColors.text,
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        flex: 1,
        // marginLeft: '5px',
    },
};

export default MemoryOverlay;