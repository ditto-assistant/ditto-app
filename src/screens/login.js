import React, { useState } from "react";
import { useNavigate } from 'react-router';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FcGoogle } from "react-icons/fc";

import { saveUserToFirestore, getUserObjectFromFirestore, loadConversationHistoryFromFirestore } from "../control/firebase";

export const withRouter = (Component) => {
    const Wrapper = (props) => {
        const history = useNavigate();
        return <Component history={history} {...props} />;
    };
    return Wrapper;
}

export const auth = getAuth();

const PasswordInput = ({ value, onChange, placeholder, showPassword, togglePasswordVisibility }) => (
    <div style={styles.passwordInputContainer}>
        <input
            type={showPassword ? "text" : "password"}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            style={styles.input}
        />
        {showPassword ?
            <FaEyeSlash onClick={togglePasswordVisibility} style={styles.icon} /> :
            <FaEye onClick={togglePasswordVisibility} style={styles.icon} />
        }
    </div>
);

const Login = (props) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [retypePassword, setRetypePassword] = useState(""); // For re-type password
    const [firstName, setFirstName] = useState(""); // For first name
    const [lastName, setLastName] = useState(""); // For last name
    const [isCreatingAccount, setIsCreatingAccount] = useState(false); // To toggle between sign-in and sign-up
    const [showPassword, setShowPassword] = useState(false); // To toggle password visibility
    const [verificationMessage, setVerificationMessage] = useState(""); // To show verification message

    

    const handleSignIn = async () => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Check if user's email is verified
            if (!user.emailVerified) {
                setVerificationMessage("Please verify your email before signing in.");
                return;
            }

            // Get user data from Firestore (if it exists)
            const userID = user.uid;
            const userObject = await getUserObjectFromFirestore(userID);

            if (userObject !== false) {
                const { firstName, lastName } = userObject;
                // Save to local storage
                localStorage.setItem('userID', user.uid);
                localStorage.setItem('email', email);
                localStorage.setItem('firstName', firstName);
                localStorage.setItem('lastName', lastName);
            }
            props.history("/dashboard"); // Navigate to dashboard or any other page
        } catch (error) {
            console.error("Error signing in:", error.message);
            // Handle errors (e.g., show an error message to the user)
            alert("Invalid email or password. Please try again.");
        }
    };

    const handleSignUp = async () => {
        if (password !== retypePassword) {
            console.error("Passwords do not match");
            // Handle errors (e.g., show an error message to the user)
            alert("Passwords do not match. Please try again.");
            return;
        }

        if (firstName === "" || lastName === "") {
            console.error("First name and last name are required");
            // Handle errors (e.g., show an error message to the user)
            alert("First name and last name are required. Please try again.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Send email verification
            await sendEmailVerification(user);
            setVerificationMessage("A verification email has been sent to your email address. Please verify your email and then sign in.");

            // Call the function to save user data to Firestore
            saveUserToFirestore(user.uid, email, firstName, lastName);

            // Save to local storage
            localStorage.setItem('userID', user.uid);
            localStorage.setItem('email', email);
            localStorage.setItem('firstName', firstName);
            localStorage.setItem('lastName', lastName);

            // Wipe local storage of conversation history 
            localStorage.removeItem('prompts');
            localStorage.removeItem('responses');
            localStorage.removeItem('histCount');

            setIsCreatingAccount(false); // Switch back to sign-in mode
            setEmail("");
            setPassword("");
            setRetypePassword("");
            setFirstName("");
            setLastName("");

        } catch (error) {
            console.error("Error creating account:", error.message);
            // Handle errors (e.g., show an error message to the user)
            alert("Error creating account. Please try again.");
        }
    };

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Save user information to Firestore if necessary
            const userID = user.uid;
            const email = user.email;

            // You can add more fields according to your Firestore rules
            await saveUserToFirestore(userID, email, user.displayName?.split(" ")[0], user.displayName?.split(" ")[1]);

            // Save user info to local storage
            localStorage.setItem('userID', user.uid);
            localStorage.setItem('email', email);
            localStorage.setItem('firstName', user.displayName?.split(" ")[0]);
            localStorage.setItem('lastName', user.displayName?.split(" ")[1]);

            // Get conversation history
            const conversationHistory = await loadConversationHistoryFromFirestore(userID);
            if (conversationHistory) {
                localStorage.setItem('prompts', JSON.stringify(conversationHistory.prompts));
                localStorage.setItem('responses', JSON.stringify(conversationHistory.responses));
                localStorage.setItem('histCount', conversationHistory.prompts.length);
            }

            props.history("/dashboard");
        } catch (error) {
            console.error("Error signing in with Google:", error.message);
            // Handle errors (e.g., show an error message to the user)
            alert("Error signing in with Google. Please try again.");
        }
    }

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    }

    return (
        <div style={styles.body}>
            <div style={styles.app}>
                <header style={styles.header}>
                    <h1>{isCreatingAccount ? "Create Account" : "Sign In"}</h1>
                    {isCreatingAccount && (
                        <>
                            <input
                                type="text"
                                placeholder="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                style={styles.input}
                            />
                            <input
                                type="text"
                                placeholder="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                style={styles.input}
                            />
                        </>
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={styles.input}
                    />
                    <PasswordInput
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        showPassword={showPassword}
                        togglePasswordVisibility={togglePasswordVisibility}
                    />
                    {isCreatingAccount && (
                        <PasswordInput
                            placeholder="Re-type Password"
                            value={retypePassword}
                            onChange={(e) => setRetypePassword(e.target.value)}
                            showPassword={showPassword}
                            togglePasswordVisibility={togglePasswordVisibility}
                        />
                    )}
                    <button onClick={isCreatingAccount ? handleSignUp : handleSignIn} style={styles.button}>
                        {isCreatingAccount ? "Sign Up" : "Sign In"}
                    </button>
                    {!isCreatingAccount && (
                        <button onClick={handleGoogleSignIn} style={styles.googleButton}>
                            <FcGoogle style={styles.googleIcon} /> Sign in with Google
                        </button>
                    )}
                    <p style={styles.text}>
                        {isCreatingAccount ?
                            "Already have an account?" :
                            "Don't have an account?"
                        }
                        <span
                            onClick={() => {
                                setIsCreatingAccount(!isCreatingAccount);
                                setVerificationMessage(""); // Clear any previous verification message
                            }}
                            style={styles.link}
                        >
                            {isCreatingAccount ? " Sign in here" : " Create one here"}
                        </span>
                    </p>
                    {verificationMessage && <p style={styles.verificationText}>{verificationMessage}</p>}
                </header>
            </div>
        </div>
    );
}

const styles = {
    body: {
        margin: 0,
        padding: 0,
        fontFamily: 'Roboto, sans-serif',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#23272a',
    },
    app: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        width: '100%',
        maxWidth: '400px',
        backgroundColor: '#ffffffb0',
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        padding: '40px 20px',
        boxSizing: 'border-box',
    },
    header: {
        margin: 0,
        fontSize: '24px',
        color: '#333',
        textAlign: 'center',
    },
    input: {
        width: '100%',
        maxWidth: '100%',
        padding: '12px 15px',
        margin: '10px 0',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '16px',
        transition: 'all 0.3s ease',
        boxSizing: 'border-box',
    },
    passwordInputContainer: {
        position: 'relative',
        width: '100%',
    },
    icon: {
        position: 'absolute',
        top: '50%',
        right: '15px',
        transform: 'translateY(-50%)',
        cursor: 'pointer',
        color: '#aaa',
    },
    button: {
        width: '100%',
        padding: '12px 15px',
        backgroundColor: '#6200ee',
        color: '#ffffff',
        border: 'none',
        borderRadius: '4px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        marginTop: '20px',
        boxSizing: 'border-box',
    },
    googleButton: {
        width: '100%',
        padding: '12px 15px',
        backgroundColor: '#ffffff',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease',
        marginTop: '10px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleIcon: {
        marginRight: '10px',
        fontSize: '20px',
    },
    text: {
        marginTop: '20px',
        fontSize: '14px',
        color: '#333',
        textAlign: 'center',
    },
    link: {
        color: '#6200ee',
        cursor: 'pointer',
        transition: 'color 0.3s ease',
        textDecoration: 'underline',
    },
    verificationText: {
        marginTop: '20px',
        fontSize: '14px',
        color: '#e53e3e',
        textAlign: 'center',
    },
};

export default withRouter(Login);