import React from 'react';
import { FaSearch } from 'react-icons/fa';

const darkModeColors = {
    background: '#1E1F22',
    foreground: '#2B2D31',
    primary: '#5865F2',
    text: '#FFFFFF',
    textSecondary: '#B5BAC1',
    border: '#1E1F22',
    inputBackground: '#1E1F22',
};

const SearchBar = ({ searchTerm, onSearchChange }) => {
    return (
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
    );
};

const styles = {
    searchContainer: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: darkModeColors.inputBackground,
        borderRadius: '8px',
        padding: '8px 16px',
        margin: '16px auto',
        width: '100%',
        maxWidth: '400px',
        border: `1px solid ${darkModeColors.border}`,
        transition: 'all 0.2s ease',
        '&:focus-within': {
            borderColor: darkModeColors.primary,
            boxShadow: `0 0 0 2px ${darkModeColors.primary}20`,
        },
    },
    searchIcon: {
        color: darkModeColors.textSecondary,
        marginRight: '12px',
        fontSize: '14px',
    },
    searchInput: {
        backgroundColor: 'transparent',
        border: 'none',
        color: darkModeColors.text,
        fontSize: '14px',
        width: '100%',
        outline: 'none',
        '&::placeholder': {
            color: darkModeColors.textSecondary,
        },
    },
};

export default SearchBar; 