// Progressive messages that become more patient/urgent over time
const EARLY_MESSAGES = [
  "Starting to generate your image...",
  "Initializing image creation...",
  "Getting started on your image...",
  "Beginning the creative process...",
  "Setting up the image generation...",
  "Preparing to create your image...",
  "Loading the image generator...",
  "Launching the creation process...",
] as const

const MIDDLE_MESSAGES = [
  "Working on your image...",
  "Creating your masterpiece...",
  "Processing your request...",
  "Building your image...",
  "Crafting the details...",
  "This usually takes 30-60 seconds...",
  "Generating pixel by pixel...",
  "Bringing your vision to life...",
  "Composing the elements...",
  "Rendering your creation...",
  "Working through the details...",
  "Making progress on your image...",
] as const

const LATE_MESSAGES = [
  "Still working on your image...",
  "Adding finishing touches...",
  "Just a bit more time needed...",
  "Quality takes time - almost ready!",
  "Perfecting the final details...",
  "Stay with us, almost done!",
  "Putting on the final polish...",
  "Working through the last steps...",
  "Nearly there, just finishing up...",
  "Fine-tuning the last details...",
  "Completing the final touches...",
  "Your image is almost ready!",
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
