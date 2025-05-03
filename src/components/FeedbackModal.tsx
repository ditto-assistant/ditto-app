import React, { useState } from "react"
import { X, Bug, Lightbulb, ExternalLink } from "lucide-react"
import Modal from "./ui/modals/Modal"
import { Button } from "./ui/button"
import { useModal } from "@/hooks/useModal"
import { toast } from "sonner"
import { BASE_URL } from "@/firebaseConfig"
import { getDeviceID, APP_VERSION } from "@/utils/deviceId"
import { useAuth, useAuthToken } from "@/hooks/useAuth"
import { LoadingSpinner } from "./ui/loading/LoadingSpinner"
import SocialLinks from "./ui/links/SocialLinks"
import { cn } from "@/lib/utils"
import { Textarea } from "./ui/textarea"
import { Separator } from "./ui/separator"

type FeedbackType = "bug" | "feature-request"

export default function FeedbackModal() {
  const { createCloseHandler } = useModal()
  const closeModal = createCloseHandler("feedback")
  const [selectedType, setSelectedType] = useState<FeedbackType>("bug")
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const auth = useAuth()
  const token = useAuthToken()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!feedback.trim()) return

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("userID", auth.user?.uid || "")
      formData.append("deviceID", getDeviceID())
      formData.append("version", APP_VERSION)
      formData.append("type", selectedType)
      formData.append("feedback", feedback)

      const response = await fetch(`${BASE_URL}/v1/feedback`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.data}`,
        },
        body: formData,
      })

      if (response.status === 201) {
        toast.success("Feedback submitted successfully!")
        setFeedback("")
        closeModal()
      } else {
        const error = await response.text()
        toast.error(error || "Failed to submit feedback")
      }
    } catch (error) {
      console.error("Error submitting feedback:", error)
      toast.error("Failed to submit feedback. Please try again later.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (auth.isLoading || token.isLoading) {
    return <LoadingSpinner />
  }

  if (auth.error || token.error) {
    return (
      <div className="bg-destructive/10 text-destructive p-3 rounded-md border border-destructive/20 text-sm">
        Authentication required
      </div>
    )
  }

  return (
    <Modal
      id="feedback"
      title="Send Feedback"
    >
      <form onSubmit={handleSubmit} className="px-4 py-2 flex flex-col gap-6">
        <div className="space-y-3">
          <label className="text-sm font-medium">Feedback Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedType("bug")}
              className={cn(
                "h-12 relative overflow-hidden transition-all duration-200 active:scale-95 cursor-pointer",
                selectedType === "bug" 
                  ? "bg-gradient-to-r from-red-950/70 to-red-900/50 border border-red-500/30 text-white"
                  : "border border-border/50 hover:bg-background/80 hover:border-border/70"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Bug className={cn(
                  "h-5 w-5 transition-colors duration-200",
                  selectedType === "bug" ? "text-red-400" : "text-muted-foreground group-hover:text-red-400/70"
                )} />
                <span>Report Bug</span>
              </div>
              {selectedType === "bug" && (
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-red-400/5 pointer-events-none" />
              )}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedType("feature-request")}
              className={cn(
                "h-12 relative overflow-hidden transition-all duration-200 active:scale-95 cursor-pointer",
                selectedType === "feature-request" 
                  ? "bg-gradient-to-r from-amber-950/70 to-amber-900/50 border border-amber-500/30 text-white"
                  : "border border-border/50 hover:bg-background/80 hover:border-border/70"
              )}
            >
              <div className="flex items-center justify-center gap-2">
                <Lightbulb className={cn(
                  "h-5 w-5 transition-colors duration-200",
                  selectedType === "feature-request" ? "text-amber-300" : "text-muted-foreground group-hover:text-amber-300/70"
                )} />
                <span>Suggest Idea</span>
              </div>
              {selectedType === "feature-request" && (
                <div className="absolute inset-0 bg-gradient-to-r from-amber-600/10 to-amber-400/5 pointer-events-none" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="feedback" className="text-sm font-medium">
            Your Feedback
          </label>
          <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Please share your thoughts, suggestions, or report any issues..."
            required
            className="min-h-[150px] bg-background/50 border-border/60 focus-visible:border-primary/50"
          />
        </div>
        
        <Button
          type="submit"
          disabled={isSubmitting || !feedback.trim()}
          className="w-full bg-primary/90 hover:bg-primary text-primary-foreground h-11 transition-all duration-200 hover:shadow-[0_0_15px_rgba(29,78,216,0.2)] active:scale-[0.98] cursor-pointer"
        >
          {isSubmitting ? "Submitting..." : "Submit Feedback"}
        </Button>
        
        <Separator className="bg-border/40" />
        
        <div className="flex flex-col items-center text-center space-y-3">
          <p className="text-sm text-foreground/80">
            Want to help us improve Ditto even more?
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-secondary/40 hover:bg-secondary/60 border-secondary/50 text-secondary-foreground transition-all duration-200 hover:shadow-[0_0_15px_rgba(148,163,184,0.2)] active:scale-95 cursor-pointer"
            asChild
          >
            <a 
              href="https://docs.google.com/forms/d/e/1FAIpQLSeG3aEOYCgcLHTNQUN1DT9c0_-cghIvG-PWfw7AIFweELMubQ/viewform"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:translate-y-[-0.5px]" />
              Take our User Survey
            </a>
          </Button>
        </div>
        
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2 text-foreground/90">Connect with us</h3>
          <SocialLinks />
        </div>
      </form>
    </Modal>
  )
}
