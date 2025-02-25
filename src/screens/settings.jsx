import { useState } from "react";
import {
  Divider,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { deleteUser, getAuth } from "firebase/auth";
import {
  removeUserFromFirestore,
  deleteAllUserScriptsFromFirestore,
} from "../control/firebase";
import packageJson from "../../package.json";
import { useBalance } from "../hooks/useBalance";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { clearStorage } from "@/utils/deviceId";
import Modal from "@/components/ui/modals/Modal";
import { useModal } from "@/hooks/useModal";
import { A } from "@/components/ui/links/Anchor";

export default function Settings() {
  const balance = useBalance();
  const { signOut, user } = useAuth();
  const auth = getAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reAuthDialogOpen, setReAuthDialogOpen] = useState(false);
  const { createCloseHandler } = useModal();
  const closeModal = createCloseHandler("settings");

  const handleLogout = () => {
    console.log("logging out");
    const hasSeenTOS = localStorage.getItem("hasSeenTOS");
    localStorage.clear();
    if (hasSeenTOS) {
      localStorage.setItem("hasSeenTOS", hasSeenTOS);
    }
    signOut();
    closeModal();
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      console.error("No user currently signed in");
      alert("You are not currently signed in. Please sign in and try again.");
      handleLogout();
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Firebase auth user not found");
      }

      const metadata = currentUser.metadata;
      const lastSignInTime = new Date(metadata.lastSignInTime).getTime();
      const now = new Date().getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - lastSignInTime > fiveMinutes) {
        setDeleteDialogOpen(false);
        setReAuthDialogOpen(true);
        return;
      }

      await deleteUser(currentUser);
      console.log("Account deleted");
      await removeUserFromFirestore(currentUser.uid);
      await deleteAllUserScriptsFromFirestore(currentUser.uid);
      clearStorage();
      closeModal();
    } catch (error) {
      console.error("Error deleting account: ", error);
      if (error.code === "auth/requires-recent-login") {
        setDeleteDialogOpen(false);
        setReAuthDialogOpen(true);
      } else {
        alert(`Error deleting account: ${error.message}`);
      }
    }
  };

  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  return (
    <Modal id="settings" title="Settings">
      <div style={styles.settingsContent}>
        <div style={styles.tokensInfo}>
          {!balance.isLoading ? (
            <>
              <p style={styles.balanceItem}>
                Ditto Tokens:{" "}
                <span style={styles.highlightText}>
                  {balance.data?.balance}
                </span>
              </p>
              <p style={styles.balanceItem}>
                Images:{" "}
                <span style={styles.highlightText}>{balance.data?.images}</span>
              </p>
              <p style={styles.balanceItem}>
                Searches:{" "}
                <span style={styles.highlightText}>
                  {" "}
                  {balance.data?.searches}{" "}
                </span>
              </p>
            </>
          ) : (
            <div style={styles.spinnerContainer}>
              <LoadingSpinner size={45} inline={true} />
            </div>
          )}
        </div>
        <div style={styles.settingsOptions}>
          <A href="/checkout" variant="contained" style={styles.button}>
            ADD TOKENS
          </A>
          <div style={styles.buttonRow}>
            <Button
              variant="contained"
              onClick={handleLogout}
              style={styles.halfButton}
            >
              LOG OUT
            </Button>
            <Button
              variant="contained"
              onClick={openDeleteDialog}
              style={styles.deleteButton}
            >
              DELETE ACCOUNT
            </Button>
          </div>
        </div>
      </div>
      <footer style={styles.footer}>
        <Divider style={styles.divider} />
        <div style={styles.versionContainer}>
          <small>Version: {packageJson.version}</small>
        </div>
      </footer>

      <Dialog
        open={reAuthDialogOpen}
        onClose={() => setReAuthDialogOpen(false)}
        PaperProps={{
          style: {
            backgroundColor: "#36393f",
            color: "white",
            maxWidth: "400px",
            width: "90%",
          },
        }}
      >
        <DialogTitle style={{ color: "white" }}>
          Re-authentication Required
        </DialogTitle>
        <DialogContent>
          <DialogContentText style={{ color: "#8e9297" }}>
            For security reasons, you need to sign in again before deleting your
            account. Would you like to sign out now?
          </DialogContentText>
        </DialogContent>
        <DialogActions style={{ padding: "16px" }}>
          <Button
            onClick={() => setReAuthDialogOpen(false)}
            style={{ color: "#7289da" }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              setReAuthDialogOpen(false);
              handleLogout();
            }}
            style={{
              backgroundColor: "#7289da",
              color: "white",
              "&:hover": {
                backgroundColor: "#5b6eae",
              },
            }}
          >
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        aria-labelledby="delete-account-dialog-title"
        aria-describedby="delete-account-dialog-description"
        PaperProps={{
          style: {
            backgroundColor: "#36393f",
            color: "white",
          },
        }}
      >
        <DialogTitle id="delete-account-dialog-title">
          {"Confirm Account Deletion"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText
            id="delete-account-dialog-description"
            style={{ color: "#8e9297" }}
          >
            Are you sure you want to delete your account? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} style={{ color: "#7289da" }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAccount}
            style={{ color: "#f04747" }}
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Modal>
  );
}

const styles = {
  overlay: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#2f3136",
  },
  settingsContainer: {
    backgroundColor: "#36393f",
    borderRadius: "8px",
    width: "400px",
    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
  },
  header: {
    backgroundColor: "#2f3136",
    padding: "15px",
    borderRadius: "8px 8px 0 0",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  headerTitle: {
    margin: 0,
    fontSize: "1.2em",
    fontWeight: "bold",
  },
  backButton: {
    position: "absolute",
    left: "15px",
    color: "#7289da",
    fontWeight: "bold",
    "&:hover": {
      backgroundColor: "transparent",
      color: "#5b6eae",
    },
  },
  settingsContent: {
    padding: "20px",
  },
  tokensInfo: {
    color: "white",
    textAlign: "center",
    marginBottom: "20px",
    minHeight: "80px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  balanceItem: {
    margin: "5px 0",
    fontSize: "0.9em",
  },
  highlightText: {
    color: "#7289da",
    fontWeight: "bold",
  },
  settingsOptions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  button: {
    margin: "10px 0",
    width: "200px",
    color: "white",
    backgroundColor: "#7289da",
    "&:hover": {
      backgroundColor: "#5b6eae",
    },
  },
  buttonRow: {
    display: "flex",
    justifyContent: "space-between",
    width: "200px",
    margin: "10px 0",
  },
  halfButton: {
    width: "95px",
    color: "white",
    backgroundColor: "#7289da",
    "&:hover": {
      backgroundColor: "#5b6eae",
    },
  },
  deleteButton: {
    width: "95px",
    color: "white",
    backgroundColor: "#f04747",
    "&:hover": {
      backgroundColor: "#d84040",
    },
  },
  keyInputContainer: {
    marginTop: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
  },
  input: {
    marginBottom: "10px",
    width: "100%",
  },
  subtleButton: {
    width: "95px",
    backgroundColor: "#7289da",
    color: "white",
    "&:hover": {
      backgroundColor: "#5b6eae",
    },
  },
  buttonGroup: {
    display: "flex",
    justifyContent: "space-between",
    width: "200px",
    marginTop: "10px",
  },
  footer: {
    padding: "15px",
  },
  divider: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    margin: "0 0 15px 0",
  },
  versionContainer: {
    color: "#8e9297",
    fontSize: "0.8em",
    textAlign: "center",
  },
  spinnerContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "80px",
  },
};
