// Progressive messages that become more patient/urgent over time
const EARLY_MESSAGES = [
  "Starting to generate your image... Please don't close the app.",
  "Initializing image creation... Keep the app open.",
  "Getting started on your image... Please stay here.",
  "Beginning the creative process... Don't close the app.",
  "Setting up the image generation... Keep this window open.",
  "Preparing to create your image... Please don't close the app.",
  "Loading the image generator... Stay here while we work.",
  "Launching the creation process... Keep the app open.",
] as const

const MIDDLE_MESSAGES = [
  "Working on your image... Please keep the app open.",
  "Creating your masterpiece... Don't close the app.",
  "Processing your request... Stay here with us.",
  "Building your image... Please don't close the app.",
  "Crafting the details... Keep this window open.",
  "This usually takes 30-60 seconds... Please stay here.",
  "Generating pixel by pixel... Don't close the app.",
  "Bringing your vision to life... Keep the app open.",
  "Composing the elements... Please don't close the app.",
  "Rendering your creation... Stay here while we work.",
  "Working through the details... Keep this window open.",
  "Making progress on your image... Please don't close the app.",
] as const

const LATE_MESSAGES = [
  "Still working on your image... Please don't close the app.",
  "Adding finishing touches... Keep the app open.",
  "Just a bit more time needed... Please stay here.",
  "Quality takes time - almost ready! Don't close the app.",
  "Perfecting the final details... Keep this window open.",
  "Stay with us, almost done! Please don't close the app.",
  "Putting on the final polish... Keep the app open.",
  "Working through the last steps... Please stay here.",
  "Nearly there, just finishing up... Don't close the app.",
  "Fine-tuning the last details... Keep this window open.",
  "Completing the final touches... Please don't close the app.",
  "Your image is almost ready! Keep the app open.",
] as const

class ImageGenerationMessageService {
  private currentIndex = 0
  private currentPhase: "early" | "middle" | "late" = "early"
  private intervalId: ReturnType<typeof setInterval> | null = null
  private phaseTimeoutId: ReturnType<typeof setTimeout> | null = null
  private isActive = false
  private startTime = 0

  private getCurrentPhaseMessages(): readonly string[] {
    switch (this.currentPhase) {
      case "early":
        return EARLY_MESSAGES
      case "middle":
        return MIDDLE_MESSAGES
      case "late":
        return LATE_MESSAGES
    }
  }

  getCurrentMessage(): string {
    const messages = this.getCurrentPhaseMessages()
    return messages[this.currentIndex % messages.length]
  }

  startRotation(onUpdate: (message: string) => void): void {
    this.isActive = true
    this.currentIndex = 0
    this.currentPhase = "early"
    this.startTime = Date.now()

    // Call immediately with first message
    onUpdate(this.getCurrentMessage())

    // Set up interval to rotate messages every 6 seconds (slower)
    this.intervalId = setInterval(() => {
      if (!this.isActive) return

      this.currentIndex++
      onUpdate(this.getCurrentMessage())
    }, 6000)

    // Transition to middle phase after 18 seconds
    this.phaseTimeoutId = setTimeout(() => {
      if (!this.isActive) return
      this.currentPhase = "middle"
      this.currentIndex = 0
      onUpdate(this.getCurrentMessage())

      // Transition to late phase after 60 seconds total
      this.phaseTimeoutId = setTimeout(() => {
        if (!this.isActive) return
        this.currentPhase = "late"
        this.currentIndex = 0
        onUpdate(this.getCurrentMessage())
      }, 42000) // 60 - 18 = 42 seconds more
    }, 18000) // 18 seconds
  }

  stopRotation(): void {
    this.isActive = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.phaseTimeoutId) {
      clearTimeout(this.phaseTimeoutId)
      this.phaseTimeoutId = null
    }
  }

  reset(): void {
    this.stopRotation()
    this.currentIndex = 0
    this.currentPhase = "early"
    this.startTime = 0
  }
}

// Export a singleton instance
export const imageGenerationMessageService = new ImageGenerationMessageService()
