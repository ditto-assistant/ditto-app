import { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    useEffect(() => {
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
            document.body.style.background = gradient;
            
            const appElements = document.getElementsByClassName('App');
            for (let element of appElements) {
                element.style.background = gradient;
            }
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

    return <ThemeContext.Provider value={{}}>{children}</ThemeContext.Provider>;
} 