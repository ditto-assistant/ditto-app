import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { AppBar, Toolbar, Typography, IconButton } from "@mui/material";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useIsMobile } from "../hooks/useIsMobile";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    height: "calc(var(--vh, 1vh) * 100)",
    backgroundColor: "#2f3136",
    color: "white",
    width: "100%",
    position: "fixed",
    top: 0,
    left: 0,
    overflow: "hidden",
  },
  appBar: {
    backgroundColor: "rgba(32, 34, 37, 0.9)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "none",
    width: "100%",
  },
  toolbar: {
    minHeight: "60px",
    padding: "0 20px",
    display: "flex",
    alignItems: "center",
    position: "relative",
    justifyContent: "space-between",
  },
  backButton: {
    color: "#dcddde",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    transition: "all 0.3s ease",
    padding: "8px",
    borderRadius: "50%",
    zIndex: 1,
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      transform: "scale(1.1)",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
    },
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: "600",
    color: "#dcddde",
    fontFamily: "Inter, sans-serif",
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
    width: "auto",
    pointerEvents: "none",
  },
  fullscreenButton: {
    color: "#dcddde",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    transition: "all 0.3s ease",
    padding: "8px",
    borderRadius: "50%",
    zIndex: 1,
    marginLeft: "auto",
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      transform: "scale(1.1)",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
    },
  },
  iframeContainer: {
    flex: 1,
    width: "100%",
    position: "relative",
    overflow: "hidden",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
    position: "absolute",
    top: 0,
    left: 0,
  },
  fullscreenMobileNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(32, 34, 37, 0.9)",
    backdropFilter: "blur(10px)",
    padding: "8px 20px",
    position: "fixed",
    bottom: 0,
    width: "100%",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    height: "60px",
  },
};

const DittoCanvas = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const script = location.state?.script || "";
  const scriptName = location.state?.scriptName || "Unknown Script";
  const iframeRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVH();
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);

    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
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
            <Typography variant="h6" style={styles.title}>
              {scriptName}
            </Typography>
            <IconButton
              style={styles.fullscreenButton}
              onClick={toggleFullscreen}
              aria-label="fullscreen"
            >
              <FullscreenIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}
      <div ref={iframeRef} style={styles.iframeContainer}>
        <iframe
          title={scriptName}
          srcDoc={script}
          style={styles.iframe}
          scrolling="auto"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
      {isFullscreen && isMobile && (
        <div style={styles.fullscreenMobileNav}>
          <IconButton style={styles.backButton} onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" style={styles.title}>
            {scriptName}
          </Typography>
          <IconButton
            style={styles.fullscreenButton}
            onClick={toggleFullscreen}
          >
            <FullscreenExitIcon />
          </IconButton>
        </div>
      )}
    </div>
  );
};

export default DittoCanvas;
