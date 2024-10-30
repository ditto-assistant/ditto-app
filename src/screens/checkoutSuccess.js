import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaCheckCircle } from 'react-icons/fa';

const CheckoutSuccess = () => {
    const navigate = useNavigate();

    return (
        <div style={styles.overlay}>
            <motion.div 
                style={styles.container}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                <div style={styles.content}>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.2
                        }}
                    >
                        <FaCheckCircle style={styles.icon} />
                    </motion.div>
                    <motion.h1 
                        style={styles.title}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        Purchase Successful!
                    </motion.h1>
                    <motion.p 
                        style={styles.subtitle}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        Your tokens have been added to your account
                    </motion.p>
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <Button 
                            variant="contained" 
                            onClick={() => navigate("/")}
                            style={styles.button}
                        >
                            Return Home
                        </Button>
                    </motion.div>
                </div>
            </motion.div>
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
        padding: '20px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    container: {
        backgroundColor: '#36393f',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    },
    content: {
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
    },
    icon: {
        fontSize: '64px',
        color: '#43b581',
        marginBottom: '20px',
    },
    title: {
        color: 'white',
        fontSize: '2em',
        margin: '0 0 16px 0',
        fontWeight: '600',
    },
    subtitle: {
        color: '#b9bbbe',
        fontSize: '1.1em',
        margin: '0 0 32px 0',
    },
    button: {
        backgroundColor: '#7289da',
        padding: '10px 24px',
        fontSize: '1.1em',
        '&:hover': {
            backgroundColor: '#677bc4',
        },
    },
};

export default CheckoutSuccess;
