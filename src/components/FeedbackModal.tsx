import React, { useState } from "react"
import { X, Bug, Lightbulb } from "lucide-react"
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
      headerRightContent={
        <Button
          variant="ghost"
          size="icon"
          onClick={closeModal}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      }
    >
      <div className="flex flex-col space-y-4 p-4">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Feedback Type</label>
            <div className="flex gap-3 sm:flex-row flex-col">
              <Button
                type="button"
                variant={selectedType === "bug" ? "default" : "outline"}
                onClick={() => setSelectedType("bug")}
                className={cn(
                  "flex-1",
                  selectedType === "bug" &&
                    "bg-gradient-to-r from-red-900 to-red-400"
                )}
              >
                <Bug className="mr-2 h-4 w-4 text-red-400" />
                Report Bug
              </Button>
              <Button
                type="button"
                variant={
                  selectedType === "feature-request" ? "default" : "outline"
                }
                onClick={() => setSelectedType("feature-request")}
                className={cn(
                  "flex-1",
                  selectedType === "feature-request" &&
                    "bg-gradient-to-r from-amber-800 to-amber-300"
                )}
              >
                <Lightbulb className="mr-2 h-4 w-4 text-amber-300" />
                Suggest Idea
              </Button>
            </div>
          </div>
          <div className="flex flex-col space-y-2">
            <label htmlFor="feedback" className="text-sm font-medium">
              Your Feedback
            </label>
            <textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Please share your thoughts, suggestions, or report any issues..."
              required
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !feedback.trim()}
            className="w-full"
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
          <SocialLinks />
        </form>
      </div>
    </Modal>
  )
}
