import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import {
  saveUserToFirestore,
  getUserObjectFromFirestore,
  loadConversationHistoryFromFirestore,
  auth,
} from "@/control/firebase";
import "./Login.css";
import TermsOfService from "@/components/TermsOfService";

const PasswordInput = ({
  value,
  onChange,
  placeholder,
  showPassword,
  togglePasswordVisibility,
}) => (
  <div style={styles.passwordInputContainer}>
    <input
      type={showPassword ? "text" : "password"}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={styles.input}
    />
    {showPassword ? (
      <FaEyeSlash onClick={togglePasswordVisibility} style={styles.icon} />
    ) : (
      <FaEye onClick={togglePasswordVisibility} style={styles.icon} />
    )}
  </div>
);

const Login = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState(""); // For re-type password
  const [firstName, setFirstName] = useState(""); // For first name
  const [lastName, setLastName] = useState(""); // For last name
  const [isCreatingAccount, setIsCreatingAccount] = useState(false); // To toggle between sign-in and sign-up
  const [showPassword, setShowPassword] = useState(false); // To toggle password visibility
  const [verificationMessage, setVerificationMessage] = useState(""); // To show verification message
  const [showTOS, setShowTOS] = useState(false);
  const [isViewingTOS, setIsViewingTOS] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
    document.body.classList.add("login-page");
    return () => {
      document.body.classList.remove("login-page");
    };
  }, [user, navigate]);

  const handleSignIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        setVerificationMessage("Please verify your email before signing in.");
        return;
      }

      // Get user data from Firestore (if it exists)
      const userID = user.uid;
      const userObject = await getUserObjectFromFirestore(userID);

      if (userObject !== false) {
        const { firstName, lastName } = userObject;
        localStorage.setItem("userID", user.uid);
        localStorage.setItem("email", email);
        localStorage.setItem("firstName", firstName);
        localStorage.setItem("lastName", lastName);
      }
      // The navigation will be handled by the useEffect hook
    } catch (error) {
      console.error("Error signing in:", error.message);
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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // Send email verification
      await sendEmailVerification(user);
      setVerificationMessage(
        "A verification email has been sent to your email address. Please verify your email and then sign in.",
      );

      // Call the function to save user data to Firestore
      saveUserToFirestore(user.uid, email, firstName, lastName);

      // Save to local storage
      localStorage.setItem("userID", user.uid);
      localStorage.setItem("email", email);
      localStorage.setItem("firstName", firstName);
      localStorage.setItem("lastName", lastName);
      localStorage.removeItem("hasSeenTOS");

      // TOS is already shown by handleSignUpClick, so we don't need to show it again
      // setShowTOS(true);
      
      // Switch back to sign-in mode and clear fields after successful signup
      setIsCreatingAccount(false);
      setEmail("");
      setPassword("");
      setRetypePassword("");
      setFirstName("");
      setLastName("");
    } catch (error) {
      console.error("Error creating account:", error.message);
      alert("Error creating account. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if this is the first time signing in with Google
      const userDoc = await getUserObjectFromFirestore(user.uid);
      const isNewUser = !userDoc;

      if (isNewUser) {
        localStorage.removeItem("hasSeenTOS");
      }

      // Save user information to Firestore if necessary
      const userID = user.uid;
      const email = user.email;

      // Save user info to local storage
      localStorage.setItem("userID", user.uid);
      localStorage.setItem("email", email);
      localStorage.setItem("firstName", user.displayName?.split(" ")[0]);
      localStorage.setItem("lastName", user.displayName?.split(" ")[1]);

      // Get conversation history
      const conversationHistory =
        await loadConversationHistoryFromFirestore(userID);
      if (conversationHistory) {
        localStorage.setItem(
          "prompts",
          JSON.stringify(conversationHistory.prompts),
        );
        localStorage.setItem(
          "responses",
          JSON.stringify(conversationHistory.responses),
        );
        localStorage.setItem(
          "timestamps",
          JSON.stringify(conversationHistory.timestamps),
        );
        localStorage.setItem(
          "pairIDs",
          JSON.stringify(conversationHistory.pairIDs),
        );
        localStorage.setItem(
          "memoryIDs",
          JSON.stringify(conversationHistory.memoryIDs),
        );
        localStorage.setItem(
          "histCount",
          conversationHistory.prompts.length.toString(),
        );
        localStorage.setItem("status_bar_fiat_balance", "m");

        // Dispatch event to update memory count
        window.dispatchEvent(new Event("memoryUpdated"));
      }

      // Save user to Firestore
      await saveUserToFirestore(
        userID,
        email,
        user.displayName?.split(" ")[0],
        user.displayName?.split(" ")[1],
      );

      // If it's a new user, show TOS before proceeding
      if (isNewUser) {
        setShowTOS(true);
        return;
      }

      navigate("/");
    } catch (error) {
      console.error("Error signing in with Google:", error.message);
      alert("Error signing in with Google. Please try again.");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSignUpClick = () => {
    // Validate form fields before showing TOS
    if (!email || !password || !retypePassword || !firstName || !lastName) {
      alert("Please fill out all fields before signing up.");
      return;
    }
    
    if (password !== retypePassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }
    
    // If all validations pass, show TOS
    setShowTOS(true);
    // This is not just viewing TOS, it's part of the signup process
    setIsViewingTOS(false);
  };

  return (
    <div className="login-container">
      <div className="login-form">
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
        <button
          onClick={isCreatingAccount ? handleSignUpClick : handleSignIn}
          style={styles.button}
        >
          {isCreatingAccount ? "Sign Up" : "Sign In"}
        </button>
        {!isCreatingAccount && (
          <button onClick={handleGoogleSignIn} style={styles.googleButton}>
            <FcGoogle style={styles.googleIcon} /> Continue with Google
          </button>
        )}
        <p style={styles.text}>
          {isCreatingAccount
            ? "Already have an account?"
            : "Don't have an account?"}
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
        {verificationMessage && (
          <p style={styles.verificationText}>{verificationMessage}</p>
        )}
        <p style={styles.tosText}>
          By signing up, you agree to our{" "}
          <span style={styles.link} onClick={() => {
            // When clicking Terms of Service link directly, it's just for viewing
            setShowTOS(true);
            // Set isNewAccount to false when just viewing the TOS
            setIsViewingTOS(true);
          }}>
            Terms of Service
          </span>
        </p>
      </div>
      {showTOS && (
        <TermsOfService
          onClose={() => {
            setShowTOS(false);
            setIsViewingTOS(false);
          }}
          isNewAccount={!isViewingTOS && isCreatingAccount}
          onAccept={handleSignUp}
        />
      )}
    </div>
  );
};

const styles = {
  body: {
    margin: 0,
    padding: 0,
    fontFamily: "Roboto, sans-serif",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#23272a",
  },
  app: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    width: "100%",
    maxWidth: "400px",
    backgroundColor: "#ffffffb0",
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
    borderRadius: "8px",
    padding: "40px 20px",
    boxSizing: "border-box",
  },
  header: {
    margin: 0,
    fontSize: "24px",
    color: "#333",
    textAlign: "center",
  },
  input: {
    width: "100%",
    maxWidth: "100%",
    padding: "12px 15px",
    margin: "10px 0",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "16px",
    transition: "all 0.3s ease",
    boxSizing: "border-box",
  },
  passwordInputContainer: {
    position: "relative",
    width: "100%",
  },
  icon: {
    position: "absolute",
    top: "50%",
    right: "15px",
    transform: "translateY(-50%)",
    cursor: "pointer",
    color: "#aaa",
  },
  button: {
    width: "100%",
    padding: "12px 15px",
    backgroundColor: "#6200ee",
    color: "#ffffff",
    border: "none",
    borderRadius: "4px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
    marginTop: "20px",
    boxSizing: "border-box",
  },
  googleButton: {
    width: "100%",
    padding: "12px 15px",
    backgroundColor: "#ffffff",
    color: "#333",
    border: "1px solid #ddd",
    borderRadius: "4px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
    marginTop: "10px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    marginRight: "10px",
    fontSize: "20px",
  },
  text: {
    marginTop: "20px",
    fontSize: "14px",
    color: "#333",
    textAlign: "center",
  },
  link: {
    color: "#6200ee",
    cursor: "pointer",
    transition: "color 0.3s ease",
    textDecoration: "underline",
  },
  verificationText: {
    marginTop: "20px",
    fontSize: "14px",
    color: "#e53e3e",
    textAlign: "center",
  },
  tosText: {
    marginTop: "20px",
    fontSize: "14px",
    color: "#333",
    textAlign: "center",
  },
};

export default Login;
