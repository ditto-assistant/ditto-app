import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Divider, Button, TextField, IconButton, InputAdornment } from '@mui/material';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { getAuth, deleteUser } from "firebase/auth";
import { removeUserFromFirestore, deleteAllUserScriptsFromFirestore } from "../control/firebase";
import packageJson from '../../package.json';

const Settings = () => {
  const auth = getAuth();
  const navigate = useNavigate();

  const [keyInputVisible, setKeyInputVisible] = useState(false);
  const [haApiKey, setHaApiKey] = useState(localStorage.getItem("ha_api_key") || '');
  const [haRemoteUrl, setHaRemoteUrl] = useState(localStorage.getItem("home_assistant_url") || 'http://localhost:8123');
  const [showHaApiKey, setShowHaApiKey] = useState(false);

  const handleLogout = () => {
    console.log("logging out");
    localStorage.clear();
    auth.signOut();
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

  let userID = localStorage.getItem("userID");
  const balance = Number(localStorage.getItem(`${userID}_balance`)) || 0;
  const tokensLeftInput = (balance / 0.6) * 1000000;
  const tokensLeftOutput = (balance / 2.4) * 1000000;
  const totalTokens = tokensLeftInput + tokensLeftOutput;
  const tokensPerImage = 765;
  const ImagesLeft = Math.floor(tokensLeftOutput / tokensPerImage);


  const formatNumber = (num) => {
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.settingsContainer}>
        <header style={styles.header}>
          <h2>Settings</h2>
        </header>
        <Divider style={styles.divider} />
        <div style={styles.settingsContent}>
          <div style={styles.tokensInfo}>
            {/* <p><span style={{ color: 'white' }}>Current Balance:</span> <span style={{ color: 'green' }}>${balance.toFixed(2)}</span></p> */}
            <p><span style={{ color: 'white' }}>Tokens:</span> <span style={{ color: '#7289da' }}>{formatNumber(totalTokens)}</span></p>
            <p><span style={{ color: 'white' }}>Images:</span> <span style={{ color: '#7289da' }}>{formatNumber(ImagesLeft)}</span></p>
          </div>
          <div style={styles.settingsOptions}>
            <Button variant="contained" onClick={handleLogout} style={styles.button}>
              Log Out
            </Button>
            <Button variant="contained" onClick={handleDeleteAccount} style={styles.button}>
              Delete Account
            </Button>
            <Button variant="contained" onClick={handleManageKeys} style={styles.button}>
              Manage Keys
            </Button>
            <Button variant="contained" onClick={() => navigate("/paypal")} style={styles.button}>
              Add Tokens
            </Button>
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
                    style: { color: 'white' },
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
                    style: { color: 'white' },
                  }}
                />
                <div style={styles.buttonGroup}>
                  <Button variant="contained" onClick={handleSaveKey} style={styles.subtleButton}>
                    Save
                  </Button>
                  <Button variant="contained" onClick={handleCancelKey} style={styles.subtleButton}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        <Divider style={styles.divider} />
        <footer style={styles.footer}>
          <Link to="/">
            <Button variant="contained" style={styles.navButton}>
              Go Back
            </Button>
          </Link>
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
    textAlign: 'center',
    padding: '20px',
    width: '400px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
  },
  header: {
    backgroundColor: '#2f3136',
    padding: '10px 0',
    borderRadius: '8px 8px 0 0',
    color: 'white',
  },
  settingsContent: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokensInfo: {
    margin: '10px 0',
    color: 'white',
    textAlign: 'center',
  },
  settingsOptions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  button: {
    margin: '10px',
    width: '200px',
    color: 'white',
    backgroundColor: '#7289da',
    '&:hover': {
      backgroundColor: '#5b6eae',
    },
  },
  navButton: {
    marginTop: '20px',
    backgroundColor: '#7289da',
    color: 'white',
    '&:hover': {
      backgroundColor: '#5b6eae',
    },
  },
  footer: {
    padding: '10px',
    textAlign: 'center',
  },
  keyInputContainer: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  input: {
    marginBottom: '10px',
    width: '300px',
  },
  subtleButton: {
    width: '100px',
    backgroundColor: '#7289da',
    color: 'white',
    marginBottom: '10px',
    '&:hover': {
      backgroundColor: '#5b6eae',
    },
  },
  divider: {
    backgroundColor: '#2f3136',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '220px'
  },
  versionContainer: {
    marginTop: '20px',
    color: 'white'
  }
};

export default Settings;