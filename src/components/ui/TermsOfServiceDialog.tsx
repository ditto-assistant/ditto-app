import { useNavigate } from "react-router"
import { deleteUserAccount } from "@/api/userContent"
import { useAuth } from "@/hooks/useAuth"
import { useTermsOfService } from "@/hooks/useTermsOfService"
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import MarkdownRenderer from "../MarkdownRenderer"

export interface TermsOfServiceProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isNewAccount?: boolean
  onAccept?: () => void
  // Used when fetching from backend (future implementation)
  tosVersion?: string
  tosContent?: string
}

export default function TermsOfServiceDialog({
  open,
  onOpenChange,
  isNewAccount = false,
  onAccept,
  tosVersion,
  tosContent,
}: TermsOfServiceProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showConfirmationDialog } = useConfirmationDialog()

  const { tos, tosLoading, statusLoading, error, acceptTOS } =
    useTermsOfService(user?.uid, tosVersion)

  // Use provided content or the content from the backend
  const content = tosContent || (tos ? tos.content : "")
  const isLoading = tosLoading || statusLoading

  const handleAccept = async () => {
    if (!user?.uid) {
      console.error("Missing user ID")
      toast.error("Unable to accept terms of service. Please try again.")
      return
    }

    if (!tos?.id) {
      console.error("Missing TOS ID")
      toast.error("Unable to accept terms of service. Please try again.")
      return
    }

    try {
      const success = await acceptTOS(tos.id)

      if (success) {
        if (isNewAccount) {
          // Set hasSeenTOS in localStorage when accepting during account creation
          localStorage.setItem("hasSeenTOS", "true")

          // Call the onAccept callback if provided (for sign-up process)
          if (onAccept) {
            onAccept()
          }
        }

        onOpenChange(false)
      } else {
        toast.error("Failed to record terms acceptance")
      }
    } catch (error) {
      console.error("Error accepting TOS:", error)
      toast.error("Failed to accept terms of service. Please try again.")
    }
  }

  const handleDecline = async () => {
    if (isNewAccount) {
      showConfirmationDialog({
        title: "Delete Account",
        content:
          "By declining the Terms of Service, your account will be permanently deleted. Are you sure you want to continue?",
        confirmLabel: "Yes, Delete Account",
        cancelLabel: "No, Keep Account",
        variant: "destructive",
        onConfirm: async () => {
          // Delete the user's account
          if (user?.uid) {
            const result = await deleteUserAccount(user?.uid)
            if (result instanceof Error) {
              console.error("Error deleting user account:", result)
            }
          }
          // Clear local storage
          localStorage.clear()
          // Navigate to login page
          navigate("/login")
        },
        onCancel: () => {
          // Do nothing, keeping the Terms of Service dialog open
        },
      })
    } else {
      onOpenChange(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={isNewAccount ? () => {} : onOpenChange}
      modal
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Terms of Service
            {tos?.version && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                v{tos.version}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-destructive">
            <p>
              There was an error loading the Terms of Service. Please try again
              later.
            </p>
            <p className="text-xs mt-2">{error}</p>
          </div>
        ) : (
          // Use a native scrolling container
          <div
            className="flex-1 rounded border my-4 overflow-y-auto custom-scrollbar"
            style={{
              WebkitOverflowScrolling: "touch", // For smoother iOS scrolling
            }}
          >
            <div className="p-4">
              <MarkdownRenderer
                className={cn(
                  "prose prose-invert max-w-none",
                  "prose-headings:text-primary prose-headings:font-semibold",
                  "prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg",
                  "prose-p:text-foreground/90 prose-p:my-3",
                  "prose-strong:text-white prose-strong:font-semibold",
                  "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
                  "prose-li:text-foreground/90 prose-ul:my-3 prose-ol:my-3"
                )}
              >
                {content}
              </MarkdownRenderer>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          {isNewAccount ? (
            <>
              <Button
                variant="destructive"
                onClick={handleDecline}
                disabled={isLoading}
              >
                Decline
              </Button>
              <Button
                variant="default"
                onClick={handleAccept}
                disabled={isLoading || !tos}
              >
                Accept
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              onClick={handleDecline}
              disabled={isLoading}
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
