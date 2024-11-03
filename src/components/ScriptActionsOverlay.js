import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaPen, FaCog, FaUndo, FaTrash, FaTimes } from 'react-icons/fa';
import CardMenu from './CardMenu';
import VersionOverlay from './VersionOverlay';
import DeleteConfirmationOverlay from './DeleteConfirmationOverlay';
import RevertConfirmationOverlay from './RevertConfirmationOverlay';
import './ScriptActionsOverlay.css';

const darkModeColors = {
    background: '#2F3136',
    cardBackground: '#36393F',
    primary: '#5865F2',
    danger: '#ED4245',
    text: '#FFFFFF',
};

function ScriptActionsOverlay({ 
    scriptName, 
    onPlay, 
    onEdit,
    onDeselect, 
    onClose, 
    onDelete,
    onRename,
    scriptVersions = [],
    onVersionSelect,
    onRevert
}) {
    const [isVisible, setIsVisible] = useState(false);
    const [showVersionOverlay, setShowVersionOverlay] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, isDeleteAll: false });
    const [revertConfirmation, setRevertConfirmation] = useState({ show: false });
    const [isRenaming, setIsRenaming] = useState(false);
    const overlayContentRef = useRef(null);
    const cardRef = useRef(null);

    useEffect(() => {
        setTimeout(() => setIsVisible(true), 50);

        const handleClickOutside = (event) => {
            if (overlayContentRef.current && !overlayContentRef.current.contains(event.target)) {
                handleClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    const handleVersionSelect = (version) => {
        if (onVersionSelect) {
            onVersionSelect(version);
        }
        setShowVersionOverlay(false);
    };

    const handleRename = () => {
        setIsRenaming(true);
        setMenuPosition(null);
    };

    const handleRenameSubmit = (e) => {
        const newName = e.target.value;
        if (onRename) {
            onRename(newName);
        }
        setIsRenaming(false);
    };

    const getBaseNameAndVersion = (name) => {
        if (!name) return { baseName: '', version: null };
        const versionMatch = name.match(/-v(\d+)$/);
        const version = versionMatch ? versionMatch[1] : null;
        const baseName = name.replace(/-v\d+$/, '');
        return { baseName, version };
    };

    const handleDeselectClick = () => {
        onDeselect();
        handleClose();
    };

    return (
        <div className={`ScriptActionsOverlay ${isVisible ? 'visible' : ''}`}>
            <motion.div 
                ref={overlayContentRef}
                className="ScriptActionsContent"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <button className="CloseButton" onClick={handleClose}>
                    <FaTimes />
                </button>
                <div className="ScriptActionsHeader">
                    <h3>CURRENTLY SELECTED</h3>
                    <div className="ScriptNameContainer">
                        {scriptName ? (
                            <>
                                <h2>{getBaseNameAndVersion(scriptName).baseName}</h2>
                                {getBaseNameAndVersion(scriptName).version && (
                                    <span className="VersionBadge">
                                        v{getBaseNameAndVersion(scriptName).version}
                                    </span>
                                )}
                            </>
                        ) : (
                            <h2>No script selected</h2>
                        )}
                    </div>
                </div>
                <div className="ScriptActionsButtons">
                    <motion.button
                        className="DeselectButton"
                        onClick={handleDeselectClick}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Deselect Script
                    </motion.button>
                    <motion.button
                        className="EditButton"
                        onClick={onEdit}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FaPen style={{ marginRight: '8px' }} />
                        Edit Script
                    </motion.button>
                    <motion.button
                        className="LaunchButton"
                        onClick={onPlay}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FaPlay style={{ marginRight: '8px' }} />
                        Launch Script
                    </motion.button>
                </div>
            </motion.div>

            {showVersionOverlay && cardRef.current && (
                <VersionOverlay
                    style={{
                        top: cardRef.current.getBoundingClientRect().bottom + 5,
                        left: cardRef.current.getBoundingClientRect().left,
                        width: cardRef.current.getBoundingClientRect().width,
                    }}
                    onSelect={handleVersionSelect}
                    onDelete={(index) => {
                        setDeleteConfirmation({ show: true, isDeleteAll: false });
                    }}
                >
                    {scriptVersions}
                </VersionOverlay>
            )}

            <DeleteConfirmationOverlay
                isOpen={deleteConfirmation.show}
                onClose={() => setDeleteConfirmation({ show: false })}
                onConfirm={() => {
                    if (onDelete) {
                        onDelete(deleteConfirmation.isDeleteAll);
                    }
                    setDeleteConfirmation({ show: false });
                    handleClose();
                }}
                scriptName={scriptName}
                isDeleteAll={deleteConfirmation.isDeleteAll}
            />

            <RevertConfirmationOverlay
                isOpen={revertConfirmation.show}
                onClose={() => setRevertConfirmation({ show: false })}
                onConfirm={() => {
                    if (onRevert) {
                        onRevert();
                    }
                    setRevertConfirmation({ show: false });
                    handleClose();
                }}
                scriptName={getBaseNameAndVersion(scriptName).baseName}
                version={scriptVersions.length > 0 ? scriptVersions[0].version : '1'}
            />
        </div>
    );
}

export default ScriptActionsOverlay; 