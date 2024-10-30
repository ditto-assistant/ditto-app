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
        width: '100%',
        padding: '16px',
        boxSizing: 'border-box',
        position: 'sticky',
        top: '104px', // Height of header (64px) + tabs (40px)
        zIndex: 999,
        backgroundColor: darkModeColors.foreground,
        display: 'flex',
        justifyContent: 'center',
        '@media (max-width: 600px)': {
            padding: '12px 8px',
        },
    },
    searchContainer: {
        display: 'flex',
        alignItems: 'center',
        backgroundColor: darkModeColors.inputBackground,
        borderRadius: '8px',
        padding: '8px 16px',
        width: '100%',
        maxWidth: '800px', // Increased from 600px
        minWidth: '280px', // Added minimum width
        border: `1px solid ${darkModeColors.border}`,
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        margin: '0 auto',
        '@media (max-width: 600px)': {
            padding: '8px 12px',
            margin: '0 4px',
        },
        '&:focus-within': {
            borderColor: darkModeColors.primary,
            boxShadow: `0 0 0 2px ${darkModeColors.primary}20`,
        },
    },
    searchIcon: {
        color: darkModeColors.textSecondary,
        marginRight: '12px',
        fontSize: '14px',
        flexShrink: 0,
        '@media (max-width: 600px)': {
            marginRight: '8px',
            fontSize: '12px',
        },
    },
    searchInput: {
        backgroundColor: 'transparent',
        border: 'none',
        color: darkModeColors.text,
        fontSize: '14px',
        width: '100%',
        outline: 'none',
        '@media (max-width: 600px)': {
            fontSize: '13px',
        },
        '&::placeholder': {
            color: darkModeColors.textSecondary,
        },
    },
};

export default SearchBar; 