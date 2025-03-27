import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useSearchParams } from "react-router";
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
  <div className="password-input-container">
    <input
      type={showPassword ? "text" : "password"}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
    {showPassword ? (
      <FaEyeSlash onClick={togglePasswordVisibility} className="icon" />
    ) : (
      <FaEye onClick={togglePasswordVisibility} className="icon" />
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
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  useEffect(() => {
    if (user) {
      navigate(redirectTo);
    }
  }, [user, navigate, redirectTo]);

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

      navigate(redirectTo);
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
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
        <button onClick={isCreatingAccount ? handleSignUpClick : handleSignIn}>
          {isCreatingAccount ? "Sign Up" : "Sign In"}
        </button>
        {!isCreatingAccount && (
          <button onClick={handleGoogleSignIn} className="google-button">
            <FcGoogle className="google-icon" /> Continue with Google
          </button>
        )}
        <p>
          {isCreatingAccount
            ? "Already have an account?"
            : "Don't have an account?"}
          <span
            onClick={() => {
              setIsCreatingAccount(!isCreatingAccount);
              setVerificationMessage(""); // Clear any previous verification message
            }}
            className="link"
          >
            {isCreatingAccount ? " Sign in here" : " Create one here"}
          </span>
        </p>
        {verificationMessage && (
          <p className="verification-text">{verificationMessage}</p>
        )}
        <p>
          By signing up, you agree to our{" "}
          <span
            className="link"
            onClick={() => {
              // When clicking Terms of Service link directly, it's just for viewing
              setShowTOS(true);
              // Set isNewAccount to false when just viewing the TOS
              setIsViewingTOS(true);
            }}
          >
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

export default Login;
