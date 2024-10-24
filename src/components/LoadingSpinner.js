import { FaSpinner } from "react-icons/fa";

export default function LoadingSpinner({ text }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100vw',
            position: 'fixed',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(40, 44, 52, 0.8)', // Updated background color
            zIndex: 9999
        }}>
            <FaSpinner style={{
                fontSize: '3rem',
                animation: 'spin 1s linear infinite',
                color: '#7289da' // Updated spinner color to match the app's theme
            }} />
            {text && (
                <div style={{
                    position: 'absolute',
                    top: '60%',
                    color: '#7289da',
                    fontSize: '1.5rem',
                    fontWeight: 'bold'
                }}>
                    {text}
                </div>
            )}
        </div>
    );
}