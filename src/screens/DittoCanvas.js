import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, IconButton, useMediaQuery } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#2f3136',
        color: 'white',
        overflow: 'hidden', // Prevent scrolling
        width: '100vw', // Full width of the viewport
    },
    appBar: {
        backgroundColor: '#202225',
        borderRadius: '12px',
        margin: '6px', // Reduced margin for compactness
        boxShadow: 'none', // Removed shadow for cleaner look
        width: 'calc(100% - 12px)', // Adjusted width based on margin
    },
    toolbar: {
        minHeight: '48px', // Reduced height for compactness
        justifyContent: 'space-between',
    },
    iframeContainer: {
        width: '100%',
        height: 'calc(100vh - 60px)', // Account for AppBar height
        border: 'none',
        borderRadius: '12px', // Added rounded corners
        overflow: 'hidden', // Ensure content respects border radius
        marginTop: '-0px', // Aligns edges with AppBar
    },
    backButton: {
        margin: '0 10px',
        backgroundColor: '#7289da',
        color: 'white',
        borderRadius: '8px', // Square with rounded corners
        width: '36px', // Slightly smaller size for compactness
        height: '36px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        '&:hover': {
            backgroundColor: '#5b6eae',
        },
    },
    fullscreenMobileNav: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#36393f',
        padding: '10px',
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
};

const DittoCanvas = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const script = location.state?.script || '';
    const scriptName = location.state?.scriptName || 'Unknown Script';
    const iframeRef = useRef(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const isMobile = useMediaQuery('(max-width:600px)');

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const toggleFullscreen = () => {
        const iframe = iframeRef.current;
        if (!isFullscreen) {
            if (iframe.requestFullscreen) {
                iframe.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        <div style={styles.container}>
            {!isFullscreen && (
                <AppBar position="static" style={styles.appBar}>
                    <Toolbar style={styles.toolbar}>
                        <IconButton
                            edge="start"
                            style={styles.backButton}
                            onClick={() => navigate(-1)}
                            aria-label="back"
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6" component="div" style={{ fontWeight: 500 }}>
                            {scriptName}
                        </Typography>
                        <IconButton color="inherit" onClick={toggleFullscreen}>
                            <FullscreenIcon />
                        </IconButton>
                    </Toolbar>
                </AppBar>
            )}
            <div ref={iframeRef} style={styles.iframeContainer}>
                <iframe
                    title={scriptName}
                    srcDoc={script}
                    style={{ width: '100%', height: '100%', border: 'none' }}
                />
            </div>
            {isFullscreen && isMobile && (
                <div style={styles.fullscreenMobileNav}>
                    <IconButton
                        style={styles.backButton}
                        onClick={() => navigate(-1)}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h6" component="div" style={{ flexGrow: 1, textAlign: 'center' }}>
                        {scriptName}
                    </Typography>
                    <IconButton color="inherit" onClick={toggleFullscreen}>
                        <FullscreenExitIcon />
                    </IconButton>
                </div>
            )}
        </div>
    );
};

export default DittoCanvas;