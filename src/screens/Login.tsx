import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { useAuth } from "@/hooks/useAuth"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { SiGoogle } from "@icons-pack/react-simple-icons"
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth"
import { auth } from "@/lib/firebase"
import { getUser } from "@/api/getUser"
import { createUser } from "@/api/createUser"
import TermsOfServiceDialog from "@/components/ui/TermsOfServiceDialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { FirebaseError } from "firebase/app"

const VERIFICATION_MESSAGES = {
  EMAIL_NOT_VERIFIED: "Please verify your email before signing in.",
  VERIFICATION_SENT:
    "A verification email has been sent to your email address. Please verify your email and then sign in.",
  VERIFICATION_RESENT:
    "A new verification email has been sent. Please check your inbox and verify your email before signing in.",
} as const

type PasswordInputProps = {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  showPassword: boolean
  togglePasswordVisibility: () => void
}

const PasswordInput = ({
  value,
  onChange,
  placeholder,
  showPassword,
  togglePasswordVisibility,
}: PasswordInputProps) => (
  <div className="relative w-full">
    <Input
      type={showPassword ? "text" : "password"}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="h-12 rounded-lg bg-background/50 pl-4 pr-10 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
    />
    <button
      type="button"
      onClick={togglePasswordVisibility}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? (
        <EyeOff className="h-5 w-5" />
      ) : (
        <Eye className="h-5 w-5" />
      )}
    </button>
  </div>
)

const Login = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [retypePassword, setRetypePassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [verificationMessage, setVerificationMessage] = useState("")
  const [showTOS, setShowTOS] = useState(false)
  const [isViewingTOS, setIsViewingTOS] = useState(false)
  const [isPasswordReset, setIsPasswordReset] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [resendingVerification, setResendingVerification] = useState(false)
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/"

  useEffect(() => {
    if (user && user.emailVerified) {
      navigate(redirectTo)
    }
  }, [user, navigate, redirectTo])

  const handleSignIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )
      const user = userCredential.user

      if (!user.emailVerified) {
        setVerificationMessage(VERIFICATION_MESSAGES.EMAIL_NOT_VERIFIED)
        return
      }

      // Store user ID for session
      localStorage.setItem("userID", user.uid)
      // The navigation will be handled by the useEffect hook
    } catch (error) {
      console.error("Error signing in:", error)
      toast.error("Invalid email or password. Please try again.")
    }
  }

  const handleSignUp = async () => {
    // This is called after TOS acceptance, so just finish the signup process
    try {
      setVerificationMessage(VERIFICATION_MESSAGES.VERIFICATION_SENT)

      // Switch back to sign-in mode and clear fields after successful signup
      setIsCreatingAccount(false)
      setEmail("")
      setPassword("")
      setRetypePassword("")
      setFirstName("")
      setLastName("")
    } catch (error) {
      console.error("Error completing signup:", error)
      toast.error("Error completing signup. Please try again.")
    }
  }

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider()
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Check if this is the first time signing in with Google
      const userResult = await getUser()
      const isNewUser = userResult.err || !userResult.ok

      if (isNewUser) {
        localStorage.removeItem("hasSeenTOS")
      }

      // Save user information to Firestore if necessary
      const userID = user.uid
      const email = user.email

      // Save user info to local storage
      localStorage.setItem("userID", user.uid)

      // Save user to backend
      if (email) {
        const createUserResult = await createUser({
          userID: userID,
          email: email,
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ")[1] || "",
        })
        if (createUserResult.err) {
          console.error("Error saving user to backend:", createUserResult.err)
          // Continue with the flow even if backend save fails
        }
      }

      // If it's a new user, show TOS before proceeding
      if (isNewUser) {
        setShowTOS(true)
        return
      }

      navigate(redirectTo)
    } catch (error) {
      console.error("Error signing in with Google:", error)
      toast.error("Error signing in with Google. Please try again.")
    }
  }

  const handleResendVerification = async () => {
    if (!auth.currentUser) {
      toast.error("No user found. Please sign in again.")
      return
    }

    setResendingVerification(true)
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      }
      await sendEmailVerification(auth.currentUser, actionCodeSettings)
      toast.success("Verification email sent! Please check your inbox.")
      setVerificationMessage(VERIFICATION_MESSAGES.VERIFICATION_RESENT)
    } catch (error) {
      console.error("Error resending verification email:", error)

      if (!(error instanceof FirebaseError)) {
        toast.error("Error sending verification email. Please try again.")
        return
      }

      const errorMessages: Record<string, string> = {
        "auth/too-many-requests":
          "Too many requests. Please wait before trying again.",
        "auth/user-token-expired": "Session expired. Please sign in again.",
      }

      toast.error(
        errorMessages[error.code] ||
          "Error sending verification email. Please try again."
      )
    } finally {
      setResendingVerification(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error("Please enter your email address.")
      return
    }

    try {
      await sendPasswordResetEmail(auth, email)
      setResetEmailSent(true)
      toast.success("Password reset email sent! Check your inbox.")
    } catch (error) {
      console.error("Error sending password reset email:", error)

      if (!(error instanceof FirebaseError)) {
        toast.error("Error sending password reset email. Please try again.")
        return
      }

      const errorMessages: Record<string, string> = {
        "auth/user-not-found": "No account found with this email address.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
      }

      toast.error(
        errorMessages[error.code] ||
          "Error sending password reset email. Please try again."
      )
    }
  }

  const handleSignUpClick = async () => {
    // Validate form fields before creating account
    if (!email || !password || !retypePassword || !firstName || !lastName) {
      toast.error("Please fill out all fields before signing up.")
      return
    }

    if (password !== retypePassword) {
      toast.error("Passwords do not match. Please try again.")
      return
    }

    try {
      // Create the user account first
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )
      const user = userCredential.user

      // Send email verification with continue URL back to login
      const actionCodeSettings = {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      }
      await sendEmailVerification(user, actionCodeSettings)

      // Call the function to save user data to backend
      const createUserResult = await createUser({
        userID: user.uid,
        email: email,
        firstName: firstName,
        lastName: lastName,
      })
      if (createUserResult.err) {
        console.error("Error saving user to backend:", createUserResult.err)
        // Continue with the flow even if backend save fails
      }

      // Now show TOS - user.uid will be available since account is created
      setShowTOS(true)
      setIsViewingTOS(false)
    } catch (error) {
      console.error("Error creating account:", error)

      // Handle specific Firebase auth errors
      if (!(error instanceof FirebaseError)) {
        toast.error("Error creating account. Please try again.")
        return
      }

      const errorMessages: Record<string, string> = {
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/email-already-in-use":
          "An account with this email already exists.",
        "auth/invalid-email": "Please enter a valid email address.",
      }

      toast.error(
        errorMessages[error.code] || "Error creating account. Please try again."
      )
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background bg-gradient-to-b from-background to-primary/10 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border bg-card/95 backdrop-blur-sm shadow-2xl transition-all duration-300 hover:shadow-lg hover:shadow-primary/15">
        <div
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl"
          aria-hidden="true"
        >
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-primary-foreground/30 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>

        <div className="border-b border-border/40 bg-primary/5 px-8 py-7">
          <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">
            {isPasswordReset
              ? "Reset Password"
              : isCreatingAccount
                ? "Create Account"
                : "Sign In to Ditto"}
          </h1>
        </div>

        <div className="space-y-6 px-8 py-10">
          {isPasswordReset ? (
            <>
              {resetEmailSent ? (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/20">
                    <svg
                      className="w-8 h-8 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Email Sent!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ve sent a password reset link to{" "}
                    <strong>{email}</strong>. Check your inbox and follow the
                    instructions to reset your password.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPasswordReset(false)
                      setResetEmailSent(false)
                      setEmail("")
                    }}
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Enter your email address and we&apos;ll send you a link to
                    reset your password.
                  </p>
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-lg bg-background/50 px-4 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <div className="pt-2">
                    <Button
                      className="h-12 w-full rounded-lg text-base font-semibold shadow-md transition-all duration-200 hover:bg-primary/90 hover:shadow-lg"
                      onClick={handlePasswordReset}
                    >
                      Send Reset Email
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setIsPasswordReset(false)}
                    className="w-full"
                  >
                    Back to Sign In
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {isCreatingAccount && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-12 rounded-lg bg-background/50 px-4 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <Input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-12 rounded-lg bg-background/50 px-4 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-lg bg-background/50 px-4 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary"
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

              <div className="pt-2">
                <Button
                  className="h-12 w-full rounded-lg text-base font-semibold shadow-md transition-all duration-200 hover:bg-primary/90 hover:shadow-lg"
                  onClick={isCreatingAccount ? handleSignUpClick : handleSignIn}
                >
                  {isCreatingAccount ? "Sign Up" : "Sign In"}
                </Button>
              </div>

              {!isCreatingAccount && (
                <div className="text-center">
                  <button
                    onClick={() => setIsPasswordReset(true)}
                    className="text-sm font-medium text-primary transition-colors hover:text-primary/90"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </>
          )}

          {!isCreatingAccount && !isPasswordReset && (
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  or continue with
                </span>
              </div>
            </div>
          )}

          {!isCreatingAccount && !isPasswordReset && (
            <Button
              variant="outline"
              className="h-12 w-full rounded-lg text-base font-medium transition-all duration-200 border-border/50 bg-background/50 shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md"
              onClick={handleGoogleSignIn}
            >
              <SiGoogle className="mr-3 h-5 w-5" /> Continue with Google
            </Button>
          )}

          {!isPasswordReset && (
            <p className="pt-2 text-center text-sm">
              {isCreatingAccount
                ? "Already have an account?"
                : "Don't have an account?"}
              <button
                onClick={() => {
                  setIsCreatingAccount(!isCreatingAccount)
                  setVerificationMessage("")
                }}
                className="ml-1 font-medium text-primary transition-colors hover:text-primary/90"
              >
                {isCreatingAccount ? "Sign in here" : "Create one here"}
              </button>
            </p>
          )}

          {verificationMessage && (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              <div className="flex items-center gap-3 mb-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{verificationMessage}</span>
              </div>
              {verificationMessage ===
                VERIFICATION_MESSAGES.EMAIL_NOT_VERIFIED && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                  className="w-full bg-background/50 hover:bg-background/80"
                >
                  {resendingVerification
                    ? "Sending..."
                    : "Resend Verification Email"}
                </Button>
              )}
            </div>
          )}

          {!isPasswordReset && (
            <p className="pt-2 text-center text-xs text-muted-foreground">
              By signing up, you agree to our{" "}
              <button
                className="font-medium text-primary transition-colors hover:text-primary/90"
                onClick={() => {
                  setShowTOS(true)
                  setIsViewingTOS(true)
                }}
              >
                Terms of Service
              </button>
            </p>
          )}
        </div>
      </div>

      <TermsOfServiceDialog
        open={showTOS}
        onOpenChange={(open) => {
          setShowTOS(open)
          if (!open) setIsViewingTOS(false)
        }}
        isNewAccount={!isViewingTOS && isCreatingAccount}
        onAccept={handleSignUp}
      />
    </div>
  )
}

export default Login
