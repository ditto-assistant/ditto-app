import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Divider, Button, TextField, IconButton, InputAdornment } from '@mui/material';
import { FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { deleteUser } from "firebase/auth";
import { removeUserFromFirestore, deleteAllUserScriptsFromFirestore } from "../control/firebase";
import packageJson from '../../package.json';
import { useBalance } from '../hooks/useBalance';
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "../components/LoadingSpinner";

const Settings = () => {
  const navigate = useNavigate();
  const balance = useBalance();
  const { signOut, auth } = useAuth();
  const [keyInputVisible, setKeyInputVisible] = useState(false);
  const [haApiKey, setHaApiKey] = useState(localStorage.getItem("ha_api_key") || '');
  const [haRemoteUrl, setHaRemoteUrl] = useState(localStorage.getItem("home_assistant_url") || 'http://localhost:8123');
  const [showHaApiKey, setShowHaApiKey] = useState(false);

  const handleLogout = () => {
    console.log("logging out");
    localStorage.clear();
    signOut();
    navigate("/login");
  };

  const handleDeleteAccount = () => {
    const user = auth.currentUser;
    if (user) {
      if (window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
        deleteUser(user).then(() => {
          console.log("Account deleted");
          removeUserFromFirestore(user.uid);
          deleteAllUserScriptsFromFirestore(user.uid);
          localStorage.clear();
          navigate("/login");
        }).catch((error) => {
          console.error("Error deleting account: ", error);
          if (error.code === 'auth/requires-recent-login') {
            alert("You need to log in again before deleting your account. Please log out and log back in.");
          } else {
            alert("An error occurred while deleting your account. Please try again.");
          }
        });
      }
    } else {
      console.error("No user currently signed in");
    }
  };

  const handleManageKeys = () => {
    setKeyInputVisible(true);
  };

  const handleSaveKey = () => {
    localStorage.setItem("ha_api_key", haApiKey);
    localStorage.setItem("home_assistant_url", haRemoteUrl);
    setKeyInputVisible(false);
    alert("Keys saved successfully!");
  };

  const handleCancelKey = () => {
    setKeyInputVisible(false);
    setHaApiKey(localStorage.getItem("ha_api_key") || '');
    setHaRemoteUrl(localStorage.getItem("home_assistant_url") || 'http://localhost:8123');
  };

  // Remove the balance calculation from localStorage
  const tokensLeftInput = balance ? (balance / 0.6) * 1000000 : 0;
  const tokensLeftOutput = balance ? (balance / 2.4) * 1000000 : 0;

  return (
    <div style={styles.overlay}>
      <div style={styles.settingsContainer}>
        <header style={styles.header}>
          <Button
            variant="text"
            onClick={() => navigate("/")}
            style={styles.backButton}
            startIcon={<FaArrowLeft />}
          >
            BACK
          </Button>
          <h2 style={styles.headerTitle}>Settings</h2>
        </header>
        <div style={styles.settingsContent}>
          <div style={styles.tokensInfo}>
            {!balance.loading ? (
              <>
                <p style={styles.balanceItem}>Ditto Tokens: <span style={styles.highlightText}>{balance.balance}</span></p>
                <p style={styles.balanceItem}>Images: <span style={styles.highlightText}>{balance.images}</span></p>
                <p style={styles.balanceItem}>Searches: <span style={styles.highlightText}>{balance.searches}</span></p>
              </>
            ) : (
              <div style={styles.spinnerContainer}>
                <LoadingSpinner size={45} inline={true} />
              </div>
            )}
          </div>
          <div style={styles.settingsOptions}>
            <Button variant="contained" onClick={() => navigate("/paypal")} style={styles.button}>
              ADD TOKENS
            </Button>
            <Button variant="contained" onClick={handleManageKeys} style={styles.button}>
              MANAGE KEYS
            </Button>
            <div style={styles.buttonRow}>
              <Button variant="contained" onClick={handleLogout} style={styles.halfButton}>
                LOG OUT
              </Button>
              <Button variant="contained" onClick={handleDeleteAccount} style={styles.deleteButton}>
                DELETE ACCOUNT
              </Button>
            </div>
            {keyInputVisible && (
              <div style={styles.keyInputContainer}>
                <TextField
                  variant="outlined"
                  label="Home Assistant API Key"
                  type={showHaApiKey ? 'text' : 'password'}
                  value={haApiKey}
                  onChange={(e) => setHaApiKey(e.target.value)}
                  style={styles.input}
                  InputProps={{
                    style: { color: 'white' },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowHaApiKey(!showHaApiKey)}>
                          {showHaApiKey ? <FaEyeSlash color="white" /> : <FaEye color="white" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  InputLabelProps={{
                    style: { color: '#8e9297' },
                  }}
                />
                <TextField
                  variant="outlined"
                  label="Home Assistant Remote URL"
                  type="text"
                  value={haRemoteUrl}
                  onChange={(e) => setHaRemoteUrl(e.target.value)}
                  style={styles.input}
                  InputProps={{
                    style: { color: 'white' }
                  }}
                  InputLabelProps={{
                    style: { color: '#8e9297' }
                  }}
                />
                <div style={styles.buttonGroup}>
                  <Button variant="contained" onClick={handleSaveKey} style={styles.subtleButton}>
                    SAVE
                  </Button>
                  <Button variant="contained" onClick={handleCancelKey} style={styles.subtleButton}>
                    CANCEL
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        <footer style={styles.footer}>
          <Divider style={styles.divider} />
          <div style={styles.versionContainer}>
            <small>Version: {packageJson.version}</small>
          </div>
        </footer>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#2f3136',
  },
  settingsContainer: {
    backgroundColor: '#36393f',
    borderRadius: '8px',
    width: '400px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
  },
  header: {
    backgroundColor: '#2f3136',
    padding: '15px',
    borderRadius: '8px 8px 0 0',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.2em',
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    left: '15px',
    color: '#7289da',
    fontWeight: 'bold',
    '&:hover': {
      backgroundColor: 'transparent',
      color: '#5b6eae',
    },
  },
  settingsContent: {
    padding: '20px',
  },
  tokensInfo: {
    color: 'white',
    textAlign: 'center',
    marginBottom: '20px',
    minHeight: '80px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  balanceItem: {
    margin: '5px 0',
    fontSize: '0.9em',
  },
  highlightText: {
    color: '#7289da',
    fontWeight: 'bold',
  },
  settingsOptions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  button: {
    margin: '10px 0',
    width: '200px',
    color: 'white',
    backgroundColor: '#7289da',
    '&:hover': {
      backgroundColor: '#5b6eae',
    },
  },
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '200px',
    margin: '10px 0',
  },
  halfButton: {
    width: '95px',
    color: 'white',
    backgroundColor: '#7289da',
    '&:hover': {
      backgroundColor: '#5b6eae',
    },
  },
  deleteButton: {
    width: '95px',
    color: 'white',
    backgroundColor: '#f04747',
    '&:hover': {
      backgroundColor: '#d84040',
    },
  },
  keyInputContainer: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  input: {
    marginBottom: '10px',
    width: '100%',
  },
  subtleButton: {
    width: '95px',
    backgroundColor: '#7289da',
    color: 'white',
    '&:hover': {
      backgroundColor: '#5b6eae',
    },
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '200px',
    marginTop: '10px',
  },
  footer: {
    padding: '15px',
  },
  divider: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    margin: '0 0 15px 0',
  },
  versionContainer: {
    color: '#8e9297',
    fontSize: '0.8em',
    textAlign: 'center',
  },
  spinnerContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '80px',
  },
};

export default Settings;
