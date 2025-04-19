import { motion, AnimatePresence } from "framer-motion"
import { FaTimes, FaSave } from "react-icons/fa"
import { IconButton } from "@mui/material"
import { useState } from "react"
import { saveScriptToFirestore } from "../../control/firebase"
import { useAuth } from "../../hooks/useAuth"
const darkModeColors = {
  background: "#1E1F22",
  foreground: "#2B2D31",
  primary: "#5865F2",
  secondary: "#4752C4",
  text: "#FFFFFF",
  textSecondary: "#B5BAC1",
  border: "#1E1F22"
}

const OpenSCADViewer = ({ script, onClose }) => {
  const [content, setContent] = useState(script.content)
  const [isSaving, setIsSaving] = useState(false)
  const { user } = useAuth()

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await saveScriptToFirestore(user?.uid, content, "openSCAD", script.name)

      // Update localStorage
      const openSCADScripts = JSON.parse(
        localStorage.getItem("openSCAD") || "[]"
      )
      const updatedScripts = openSCADScripts.map((s) =>
        s.name === script.name ? { ...s, content } : s
      )
      localStorage.setItem("openSCAD", JSON.stringify(updatedScripts))

      // Update workingOnScript if this is the current script
      const workingOnScript = JSON.parse(
        localStorage.getItem("workingOnScript")
      )
      if (workingOnScript && workingOnScript.script === script.name) {
        localStorage.setItem(
          "workingOnScript",
          JSON.stringify({
            script: script.name,
            contents: content,
            scriptType: "openSCAD"
          })
        )
      }

      // Trigger UI updates
      window.dispatchEvent(new Event("scriptsUpdated"))
    } catch (error) {
      console.error("Error saving script:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={styles.overlay}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          style={styles.container}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.header}>
            <h3 style={styles.title}>{script.name}</h3>
            <div style={styles.headerButtons}>
              <IconButton
                size="small"
                onClick={handleSave}
                disabled={isSaving}
                style={styles.saveButton}
              >
                <FaSave size={16} color={darkModeColors.textSecondary} />
              </IconButton>
              <IconButton
                size="small"
                onClick={onClose}
                style={styles.closeButton}
              >
                <FaTimes size={16} color={darkModeColors.textSecondary} />
              </IconButton>
            </div>
          </div>
          <textarea
            style={styles.editor}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100002,
    backdropFilter: "blur(4px)"
  },
  container: {
    backgroundColor: darkModeColors.foreground,
    borderRadius: "12px",
    width: "90%",
    maxWidth: "800px",
    maxHeight: "80vh",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.24)",
    display: "flex",
    flexDirection: "column",
    border: `1px solid ${darkModeColors.border}`,
    position: "relative",
    zIndex: 100003
  },
  header: {
    padding: "16px 24px",
    borderBottom: `1px solid ${darkModeColors.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    margin: 0,
    color: darkModeColors.text,
    fontSize: "18px",
    fontWeight: 600
  },
  headerButtons: {
    display: "flex",
    gap: "8px"
  },
  saveButton: {
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)"
    }
  },
  closeButton: {
    "&:hover": {
      backgroundColor: "rgba(255, 255, 255, 0.1)"
    }
  },
  editor: {
    padding: "24px",
    margin: 0,
    overflow: "auto",
    backgroundColor: darkModeColors.background,
    borderBottomLeftRadius: "12px",
    borderBottomRightRadius: "12px",
    maxHeight: "calc(80vh - 70px)", // Subtract header height
    width: "100%",
    boxSizing: "border-box",
    border: "none",
    outline: "none",
    resize: "none",
    fontFamily: "monospace",
    fontSize: "14px",
    color: darkModeColors.text,
    lineHeight: "1.5"
  }
}

export default OpenSCADViewer
