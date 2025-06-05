import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router"
import { applyActionCode } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { FirebaseError } from "firebase/app"

const EmailVerification = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  )
  const [message, setMessage] = useState("")

  useEffect(() => {
    const verifyEmail = async () => {
      const actionCode = searchParams.get("oobCode")

      if (!actionCode) {
        setStatus("error")
        setMessage(
          "Invalid verification link. Please check your email or request a new verification."
        )
        return
      }

      try {
        await applyActionCode(auth, actionCode)
        setStatus("success")
        setMessage(
          "Your email has been successfully verified! You can now sign in to your account."
        )
      } catch (error) {
        console.error("Email verification error:", error)
        setStatus("error")

        if (error instanceof FirebaseError) {
          if (error.code === "auth/expired-action-code") {
            setMessage(
              "This verification link has expired. Please request a new verification email."
            )
          } else if (error.code === "auth/invalid-action-code") {
            setMessage(
              "Invalid verification link. Please check your email or request a new verification."
            )
          } else {
            setMessage(
              "Failed to verify your email. Please try again or contact support."
            )
          }
        } else {
          setMessage(
            "An unexpected error occurred. Please try again or contact support."
          )
        }
      }
    }

    verifyEmail()
  }, [searchParams])

  const handleContinue = () => {
    navigate("/login")
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background bg-gradient-to-b from-background to-primary/10 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border bg-card/95 backdrop-blur-sm shadow-2xl">
        <div className="border-b border-border/40 bg-primary/5 px-8 py-7">
          <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">
            Email Verification
          </h1>
        </div>

        <div className="space-y-6 px-8 py-10 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
              <p className="text-lg text-muted-foreground">
                Verifying your email address...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Email Verified!
                </h2>
                <p className="text-muted-foreground">{message}</p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="mx-auto h-16 w-16 text-destructive" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  Verification Failed
                </h2>
                <p className="text-muted-foreground">{message}</p>
              </div>
            </>
          )}

          <Button
            onClick={handleContinue}
            className="w-full"
            disabled={status === "loading"}
          >
            Continue to Sign In
          </Button>
        </div>
      </div>
    </div>
  )
}

export default EmailVerification
