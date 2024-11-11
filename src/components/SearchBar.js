import React from "react";
import { FaSearch } from "react-icons/fa";

const darkModeColors = {
  background: "#1E1F22",
  foreground: "#2B2D31",
  primary: "#5865F2",
  text: "#FFFFFF",
  textSecondary: "#B5BAC1",
  border: "#1E1F22",
  inputBackground: "#1E1F22",
};

const SearchBar = ({ searchTerm, onSearchChange }) => {
  return (
    <div style={styles.searchWrapper}>
      <div style={styles.searchContainer}>
        <FaSearch style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search scripts..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          style={styles.searchInput}
        />
      </div>
    </div>
  );
};

const styles = {
  searchWrapper: {
    flex: 1,
    display: "flex",
    position: "relative",
    "@media (max-width: 400px)": {
      width: "100%",
    },
  },
  searchContainer: {
    display: "flex",
    alignItems: "center",
    backgroundColor: darkModeColors.inputBackground,
    borderRadius: "8px",
    padding: "8px 16px",
    width: "100%",
    border: `1px solid ${darkModeColors.border}`,
    transition: "all 0.2s ease",
    boxSizing: "border-box",
    "&:focus-within": {
      borderColor: darkModeColors.primary,
      boxShadow: `0 0 0 2px ${darkModeColors.primary}20`,
    },
  },
  searchIcon: {
    color: darkModeColors.textSecondary,
    marginRight: "12px",
    fontSize: "14px",
    flexShrink: 0,
    "@media (max-width: 600px)": {
      marginRight: "8px",
      fontSize: "12px",
    },
  },
  searchInput: {
    backgroundColor: "transparent",
    border: "none",
    color: darkModeColors.text,
    fontSize: "14px",
    width: "100%",
    outline: "none",
    "@media (max-width: 600px)": {
      fontSize: "13px",
    },
    "&::placeholder": {
      color: darkModeColors.textSecondary,
    },
  },
};

export default SearchBar;
