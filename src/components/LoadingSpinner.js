export default function FullScreenSpinner({ text }) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            width: '100vw',
            position: 'fixed',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(40, 44, 52, 0.8)',
            zIndex: 9999
        }}>
            <LoadingSpinner size={100} />
            {text && (
                <div style={{
                    marginTop: '20px',
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

export function LoadingSpinner({ size = 50, inline = false }) {
    const containerStyle = {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...(inline ? {
            width: size,
            height: size,
            display: 'inline-flex'
        } : {
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)' // Semi-transparent overlay
        })
    };

    const spinnerStyle = (index) => ({
        width: `${size * (1 - index * 0.15)}px`,
        height: `${size * (1 - index * 0.15)}px`,
        border: `${size * 0.03}px solid transparent`,
        borderTopColor: ['#7289da', '#99aab5', '#2c2f33', '#43b581'][index],
        borderRadius: '50%',
        animation: `spin ${1.25 - index * 0.25}s linear infinite${index % 2 ? ' reverse' : ''}`,
        position: 'absolute'
    });

    return (
        <div style={containerStyle}>
            {[0, 1, 2, 3].map(i => (
                <div key={i} style={spinnerStyle(i)} />
            ))}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
