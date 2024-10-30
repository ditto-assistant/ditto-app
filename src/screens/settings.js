import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Divider, Button, TextField, IconButton, InputAdornment } from '@mui/material';
import { FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { deleteUser } from "firebase/auth";
import { removeUserFromFirestore, deleteAllUserScriptsFromFirestore } from "../control/firebase";
import packageJson from '../../package.json';
import { useBalance } from '../hooks/useBalance';
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ChromePicker } from 'react-color';

const Settings = () => {
  const navigate = useNavigate();
  const balance = useBalance();
  const { signOut, auth } = useAuth();
  const [keyInputVisible, setKeyInputVisible] = useState(false);
  const [haApiKey, setHaApiKey] = useState(localStorage.getItem("ha_api_key") || '');
  const [haRemoteUrl, setHaRemoteUrl] = useState(localStorage.getItem("home_assistant_url") || 'http://localhost:8123');
  const [showHaApiKey, setShowHaApiKey] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [themeColors, setThemeColors] = useState({
    color1: localStorage.getItem("theme-color-1") || "#4a0080",
    color2: localStorage.getItem("theme-color-2") || "#000066",
    color3: localStorage.getItem("theme-color-3") || "#1a1a1a",
    color4: localStorage.getItem("theme-color-4") || "#000000"
  });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeColor, setActiveColor] = useState(null);
  const [themeNames, setThemeNames] = useState(() => {
    const savedNames = localStorage.getItem("theme-names");
    return savedNames ? JSON.parse(savedNames) : {
      classic: "Default-1",
      ocean: "Ocean-1",
      sunset: "Sunset-1",
      forest: "Forest-1"
    };
  });
  const [currentThemeName, setCurrentThemeName] = useState("Custom Theme");
  const [isEditingName, setIsEditingName] = useState(false);
  const [chatBubbleColor, setChatBubbleColor] = useState(
    localStorage.getItem("chat-bubble-color") || "#1a73e8"
  );

  useEffect(() => {
    // Apply theme colors from localStorage
    const applyTheme = () => {
        const themeColor1 = localStorage.getItem("theme-color-1") || "#4a0080";
        const themeColor2 = localStorage.getItem("theme-color-2") || "#000066";
        const themeColor3 = localStorage.getItem("theme-color-3") || "#1a1a1a";
        const themeColor4 = localStorage.getItem("theme-color-4") || "#000000";

        const gradient = `linear-gradient(to bottom, 
            ${themeColor1} 0%,
            ${themeColor2} 40%,
            ${themeColor3} 80%,
            ${themeColor4} 100%
        )`;

        document.documentElement.style.setProperty('--theme-background', gradient);
    };

    // Apply theme initially
    applyTheme();

    // Listen for storage changes
    const handleStorageChange = (e) => {
        if (e.key && e.key.startsWith('theme-color-')) {
            applyTheme();
        }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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

  const handleThemeClick = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const handleColorChange = (color) => {
    const newColors = { ...themeColors };
    newColors[activeColor] = color.hex;
    setThemeColors(newColors);
    localStorage.setItem(`theme-color-${activeColor.slice(-1)}`, color.hex);
    
    document.documentElement.style.setProperty(
      '--theme-background',
      `linear-gradient(to bottom, 
        ${newColors.color1} 0%,
        ${newColors.color2} 40%,
        ${newColors.color3} 80%,
        ${newColors.color4} 100%
      )`
    );
  };

  const handleChatBubbleColorChange = (color) => {
    setChatBubbleColor(color.hex);
    localStorage.setItem("chat-bubble-color", color.hex);
    document.documentElement.style.setProperty('--chat-bubble-sent-color', color.hex);
  };

  // Remove the balance calculation from localStorage
  const tokensLeftInput = balance ? (balance / 0.6) * 1000000 : 0;
  const tokensLeftOutput = balance ? (balance / 2.4) * 1000000 : 0;

  // Update preset themes to include chat bubble colors
  const presetThemes = {
    classic: {
      color1: "#4a0080",  // Purple
      color2: "#000066",  // Dark Blue
      color3: "#1a1a1a",  // Dark Gray
      color4: "#000000",  // Black
      chatBubbleColor: "#1a73e8"  // Classic blue bubble
    },
    ocean: {
      color1: "#006994",  // Deep Blue
      color2: "#0099cc",  // Ocean Blue
      color3: "#1a1a1a",  // Dark Gray
      color4: "#000033",  // Navy Black
      chatBubbleColor: "#006994"  // Deep blue bubble
    },
    sunset: {
      color1: "#ff6b6b",  // Coral
      color2: "#cc3366",  // Rose
      color3: "#1a1a1a",  // Dark Gray
      color4: "#000000",  // Black
      chatBubbleColor: "#cc3366"  // Rose bubble
    },
    forest: {
      color1: "#2d5a27",  // Forest Green
      color2: "#1e4d2b",  // Deep Green
      color3: "#1a1a1a",  // Dark Gray
      color4: "#000000",  // Black
      chatBubbleColor: "#2d5a27"  // Forest green bubble
    }
  };

  // Add function to save custom theme
  const saveCustomTheme = (themeName) => {
    const customTheme = {
      color1: themeColors.color1,
      color2: themeColors.color2,
      color3: themeColors.color3,
      color4: themeColors.color4,
      chatBubbleColor: chatBubbleColor
    };
    
    // Save to localStorage
    const savedThemes = JSON.parse(localStorage.getItem('custom-themes') || '{}');
    savedThemes[themeName] = customTheme;
    localStorage.setItem('custom-themes', JSON.stringify(savedThemes));
    
    // Update theme names
    setThemeNames(prev => ({
      ...prev,
      [themeName]: themeName
    }));
  };

  // Update handleApplyTheme to save the custom theme
  const handleApplyTheme = () => {
    const themeCount = Object.values(themeNames).length + 1;
    const newThemeName = `Custom Theme ${themeCount}`;
    
    // Save colors and theme
    Object.entries(themeColors).forEach(([key, value]) => {
      localStorage.setItem(`theme-color-${key.slice(-1)}`, value);
    });
    localStorage.setItem("chat-bubble-color", chatBubbleColor);
    
    // Save as custom theme
    saveCustomTheme(newThemeName);
    
    // Apply gradient
    const gradient = `linear-gradient(to bottom, 
      ${themeColors.color1} 0%,
      ${themeColors.color2} 40%,
      ${themeColors.color3} 80%,
      ${themeColors.color4} 100%
    )`;
    
    document.documentElement.style.setProperty('--theme-background', gradient);
    document.documentElement.style.setProperty('--chat-bubble-sent-color', chatBubbleColor);
    
    setCurrentThemeName(newThemeName);
    setShowColorPicker(false);
  };

  // Update handleThemeSelect to include chat bubble color
  const handleThemeSelect = (themeName) => {
    const newColors = presetThemes[themeName];
    setThemeColors({
      color1: newColors.color1,
      color2: newColors.color2,
      color3: newColors.color3,
      color4: newColors.color4
    });
    setChatBubbleColor(newColors.chatBubbleColor);
    
    // Save all colors
    Object.entries(newColors).forEach(([key, value]) => {
      if (key === 'chatBubbleColor') {
        localStorage.setItem("chat-bubble-color", value);
        document.documentElement.style.setProperty('--chat-bubble-sent-color', value);
      } else {
        localStorage.setItem(`theme-color-${key.slice(-1)}`, value);
      }
    });
    
    // Apply gradient
    document.documentElement.style.setProperty(
      '--theme-background',
      `linear-gradient(to bottom, 
        ${newColors.color1} 0%,
        ${newColors.color2} 40%,
        ${newColors.color3} 80%,
        ${newColors.color4} 100%
      )`
    );
  };

  // Add theme name editing
  const handleThemeNameChange = (e) => {
    const newName = e.target.value;
    setCurrentThemeName(newName);
    setThemeNames(prev => ({
        ...prev,
        [newName]: newName
    }));
    localStorage.setItem("theme-names", JSON.stringify(themeNames));
  };

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
            <div style={styles.themeContainer}>
              <Button variant="contained" onClick={() => setShowColorPicker(!showColorPicker)} style={styles.button}>
                THEME
              </Button>
              {showColorPicker && (
                <div style={styles.colorPickerOverlay} onClick={() => setShowColorPicker(false)}>
                  <div style={styles.colorPickerContainer} onClick={e => e.stopPropagation()}>
                    {isEditingName ? (
                        <input
                            type="text"
                            value={currentThemeName}
                            onChange={handleThemeNameChange}
                            onBlur={() => setIsEditingName(false)}
                            autoFocus
                            style={styles.themeNameInput}
                        />
                    ) : (
                        <div style={styles.themeNameDisplay} onClick={() => setIsEditingName(true)}>
                            {currentThemeName}
                        </div>
                    )}
                    <div style={styles.colorButtons}>
                      {Object.entries(themeColors).map(([key, color]) => (
                        <button
                          key={key}
                          onClick={() => setActiveColor(key)}
                          style={{
                            ...styles.colorButton,
                            ...(activeColor === key ? styles.colorButtonActive : {}),
                            backgroundColor: color
                          }}
                        />
                      ))}
                    </div>
                    {activeColor && (
                      <div style={styles.colorPickerWrapper}>
                        <ChromePicker 
                          color={themeColors[activeColor]}
                          onChange={handleColorChange}
                          styles={{
                            default: {
                              picker: {
                                background: 'var(--dark-gray-3)',
                                boxShadow: 'none',
                                border: '1px solid var(--header-footer-border)',
                              }
                            }
                          }}
                        />
                      </div>
                    )}
                    <button 
                      onClick={handleApplyTheme}
                      style={styles.applyButton}
                    >
                      Apply Theme
                    </button>
                    <div style={styles.divider} />
                    
                    {/* Add Chat Bubble Color Section */}
                    <div style={styles.chatBubbleSection}>
                        <h3 style={styles.sectionTitle}>Chat Bubble Color</h3>
                        <div style={styles.chatBubblePreview}>
                            <div style={{
                                ...styles.bubblePreview,
                                backgroundColor: chatBubbleColor
                            }}>
                                Preview Message
                            </div>
                        </div>
                        <ChromePicker 
                            color={chatBubbleColor}
                            onChange={handleChatBubbleColorChange}
                            styles={{
                                default: {
                                    picker: {
                                        background: 'var(--dark-gray-3)',
                                        boxShadow: 'none',
                                        border: '1px solid var(--header-footer-border)',
                                    }
                                }
                            }}
                        />
                    </div>
                    
                    <div style={styles.divider} />
                    <div style={styles.presetThemes}>
                        {Object.entries(presetThemes).map(([name, colors]) => (
                            <button
                                key={name}
                                onClick={() => handleThemeSelect(name)}
                                style={{
                                    ...styles.presetButton,
                                    background: `linear-gradient(to bottom, 
                                        ${colors.color1} 0%,
                                        ${colors.color2} 40%,
                                        ${colors.color3} 80%,
                                        ${colors.color4} 100%
                                    )`
                                }}
                            >
                                {name.charAt(0).toUpperCase() + name.slice(1)}
                            </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
    background: 'var(--theme-background)',
    position: 'fixed',
    width: '100%',
    height: '100%',
    overflowY: 'auto',
  },
  settingsContainer: {
    background: 'var(--dark-gray-2)',
    borderRadius: 'var(--border-radius)',
    width: '400px',
    boxShadow: 'var(--header-footer-shadow)',
    border: '1px solid var(--header-footer-border)',
    margin: '20px 0',
  },
  header: {
    background: 'var(--header-footer-gradient)',
    padding: '15px',
    borderRadius: 'var(--border-radius) var(--border-radius) 0 0',
    color: 'var(--text-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottom: '1px solid var(--header-footer-border)',
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
    background: 'var(--dark-gray-2)',
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
    backgroundColor: 'var(--primary-color)',
    border: '1px solid var(--header-footer-border)',
    '&:hover': {
      backgroundColor: 'var(--dark-gray-3)',
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
  themeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  colorPickerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    backdropFilter: 'blur(10px)',
  },
  colorPickerContainer: {
    background: 'var(--header-footer-gradient)',
    padding: '20px',
    borderRadius: 'var(--border-radius)',
    border: '1px solid var(--header-footer-border)',
    boxShadow: 'var(--header-footer-shadow)',
    maxWidth: '90%',
    width: '400px',
  },
  colorButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    marginBottom: '20px',
  },
  colorButton: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 'var(--border-radius)',
    border: '1px solid var(--header-footer-border)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  colorButtonActive: {
    transform: 'scale(1.1)',
    boxShadow: 'var(--header-footer-shadow)',
  },
  colorPickerWrapper: {
    marginTop: '20px',
  },
  presetThemes: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
    marginBottom: '20px',
  },
  presetButton: {
    width: '100%',
    aspectRatio: '1',
    borderRadius: 'var(--border-radius)',
    border: '1px solid var(--header-footer-border)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  applyButton: {
    width: '100%',
    backgroundColor: '#7289da',
    color: 'white',
    '&:hover': {
      backgroundColor: '#5b6eae',
    },
  },
  themeNameInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    marginBottom: '20px',
  },
  themeNameDisplay: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  chatBubbleSection: {
    marginBottom: '20px',
  },
  sectionTitle: {
    color: '#8e9297',
    fontSize: '1.2em',
    marginBottom: '10px',
  },
  chatBubblePreview: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100px',
    border: '1px dashed #8e9297',
    borderRadius: 'var(--border-radius)',
    marginBottom: '10px',
  },
  bubblePreview: {
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 'var(--border-radius)',
  },
};

export default Settings;
