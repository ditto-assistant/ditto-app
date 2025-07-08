interface PersonalityAssessment {
  assessment_id: string
  session_id: string
  name: string
  description: string
  completed_at: string | null
  results: any
  answers: any
  questions_answered: number
  started_at: number
  completed: boolean
}

interface PersonalityStorageData {
  assessments: PersonalityAssessment[]
  lastUpdated: number
  userId: string
}

const STORAGE_KEY = "ditto_personality_assessments"
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

export class PersonalityStorage {
  /**
   * Get personality assessments from localStorage
   */
  static get(userId: string): PersonalityAssessment[] | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)

      if (!stored) {
        console.log("🧠 PersonalityStorage.get: no cached data found")
        return null
      }

      const data: PersonalityStorageData = JSON.parse(stored)

      // Check if data is for the current user
      if (data.userId !== userId) {
        console.log(
          "🧠 PersonalityStorage.get: userId mismatch, clearing cache"
        )
        this.clear()
        return null
      }

      // Check if data is stale (older than 24 hours)
      const now = Date.now()
      const ageHours = (now - data.lastUpdated) / (1000 * 60 * 60)

      if (now - data.lastUpdated > CACHE_DURATION) {
        console.log(
          `🧠 PersonalityStorage.get: cache stale (${ageHours.toFixed(1)}h old)`
        )
        return null // Don't clear, just return null to trigger refresh
      }

      console.log(
        `🧠 PersonalityStorage.get: returning ${data.assessments.length} assessments (${ageHours.toFixed(1)}h old)`
      )
      return data.assessments
    } catch (error) {
      console.error("🧠 PersonalityStorage.get error:", error)
      this.clear()
      return null
    }
  }

  /**
   * Save personality assessments to localStorage
   */
  static set(userId: string, assessments: PersonalityAssessment[]): void {
    try {
      const data: PersonalityStorageData = {
        assessments,
        lastUpdated: Date.now(),
        userId,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error(
        "Error saving personality assessments to localStorage:",
        error
      )
    }
  }

  /**
   * Clear personality assessments from localStorage
   */
  static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error(
        "Error clearing personality assessments from localStorage:",
        error
      )
    }
  }

  /**
   * Check if cached data exists and is fresh
   */
  static isCacheFresh(userId: string): boolean {
    const cached = this.get(userId)
    return cached !== null
  }

  /**
   * Debug method to check localStorage contents
   */
  static debug(): void {
    console.log("🧠 PersonalityStorage Debug:")
    console.log("🧠 Storage key:", STORAGE_KEY)
    console.log("🧠 Cache duration:", CACHE_DURATION)

    const stored = localStorage.getItem(STORAGE_KEY)
    console.log("🧠 Raw localStorage data:", stored)

    if (stored) {
      try {
        const data = JSON.parse(stored)
        console.log("🧠 Parsed data:", data)
        console.log("🧠 Data age (ms):", Date.now() - data.lastUpdated)
        console.log(
          "🧠 Data age (hours):",
          (Date.now() - data.lastUpdated) / (1000 * 60 * 60)
        )
        console.log(
          "🧠 Is fresh:",
          Date.now() - data.lastUpdated < CACHE_DURATION
        )
      } catch (error) {
        console.error("🧠 Error parsing stored data:", error)
      }
    }
  }

  /**
   * Get the most recent assessment for each type
   */
  static getLatestAssessments(
    userId: string
  ): Record<string, PersonalityAssessment> {
    const assessments = this.get(userId)
    if (!assessments) return {}

    const latest: Record<string, PersonalityAssessment> = {}

    assessments.forEach((assessment) => {
      const existing = latest[assessment.assessment_id]
      if (
        !existing ||
        (assessment.completed_at &&
          (!existing.completed_at ||
            assessment.completed_at > existing.completed_at))
      ) {
        latest[assessment.assessment_id] = assessment
      }
    })

    return latest
  }

  /**
   * Get comprehensive personality data for AI context
   */
  static getPersonalitySummary(userId: string): string {
    const latest = this.getLatestAssessments(userId)
    const assessmentTypes = Object.keys(latest)

    if (assessmentTypes.length === 0) {
      console.log(
        "🧠 PersonalityStorage.getPersonalitySummary: no assessments found"
      )
      return ""
    }

    const assessmentSections: string[] = []

    assessmentTypes.forEach((assessmentId) => {
      const assessment = latest[assessmentId]

      if (!assessment.results || !assessment.completed) {
        console.log(
          `🧠 PersonalityStorage.getPersonalitySummary: skipping ${assessmentId} - incomplete`
        )
        return
      }

      // Include the full assessment results in a structured format
      const assessmentData = this.formatAssessmentForAI(
        assessmentId,
        assessment.results
      )
      if (assessmentData) {
        assessmentSections.push(assessmentData)
      }
    })

    const result = assessmentSections.join("\n\n")
    console.log(
      `🧠 PersonalityStorage.getPersonalitySummary: Generated comprehensive summary for ${assessmentSections.length} assessments`
    )
    return result
  }

  /**
   * Format assessment data for AI consumption
   */
  private static formatAssessmentForAI(
    assessmentId: string,
    results: any
  ): string {
    try {
      switch (assessmentId) {
        case "big-five":
          return this.formatBigFiveForAI(results)
        case "mbti":
          return this.formatMBTIForAI(results)
        case "disc":
          return this.formatDISCForAI(results)
        default:
          return `${assessmentId.toUpperCase()} Assessment:\n${JSON.stringify(results, null, 2)}`
      }
    } catch (error) {
      console.error(`🧠 Error formatting ${assessmentId} for AI:`, error)
      return ""
    }
  }

  private static formatBigFiveForAI(results: any): string {
    let output = "BIG FIVE PERSONALITY ASSESSMENT:\n"

    if (results.summary) {
      output += `Summary: ${results.summary}\n`
    }

    if (results.dimension_scores) {
      output += "Trait Scores:\n"
      Object.entries(results.dimension_scores).forEach(
        ([trait, data]: [string, any]) => {
          if (data && typeof data === "object") {
            const score = data.score || data.value || data.percentage
            const description = data.description || data.summary
            output += `  • ${trait.charAt(0).toUpperCase() + trait.slice(1)}: ${score}${typeof score === "number" && score <= 1 ? "%" : ""}`
            if (description) output += ` - ${description}`
            output += "\n"
          }
        }
      )
    }

    if (results.descriptions && Array.isArray(results.descriptions)) {
      output += "Detailed Descriptions:\n"
      results.descriptions.forEach((desc: string, index: number) => {
        output += `  ${index + 1}. ${desc}\n`
      })
    }

    return output.trim()
  }

  private static formatMBTIForAI(results: any): string {
    let output = "MBTI PERSONALITY ASSESSMENT:\n"

    if (results.personality_type) {
      output += `Type: ${results.personality_type}\n`
    }

    if (results.type_description) {
      output += `Description: ${results.type_description}\n`
    }

    if (results.dimension_details) {
      output += "Dimension Breakdown:\n"
      Object.entries(results.dimension_details).forEach(
        ([dimension, data]: [string, any]) => {
          if (data && typeof data === "object") {
            const preference = data.preference || data.type
            const strength = data.strength || data.score
            output += `  • ${dimension}: ${preference}`
            if (strength) output += ` (strength: ${strength})`
            output += "\n"
          }
        }
      )
    }

    return output.trim()
  }

  private static formatDISCForAI(results: any): string {
    let output = "DISC PERSONALITY ASSESSMENT:\n"

    if (results.profile_summary) {
      output += `Profile: ${results.profile_summary}\n`
    }

    if (results.profile_description) {
      output += `Description: ${results.profile_description}\n`
    }

    if (results.primary_style) {
      output += `Primary Style: ${results.primary_style.name || results.primary_style.style}`
      if (results.primary_style.description) {
        output += ` - ${results.primary_style.description}`
      }
      output += "\n"
    }

    if (results.secondary_style) {
      output += `Secondary Style: ${results.secondary_style.name || results.secondary_style.style}`
      if (results.secondary_style.description) {
        output += ` - ${results.secondary_style.description}`
      }
      output += "\n"
    }

    if (results.dimension_scores) {
      output += "DISC Scores:\n"
      Object.entries(results.dimension_scores).forEach(
        ([dimension, scoreData]: [string, any]) => {
          let scoreValue = scoreData

          // Handle different score data structures
          if (typeof scoreData === "object" && scoreData !== null) {
            scoreValue =
              scoreData.score ||
              scoreData.value ||
              scoreData.percentage ||
              scoreData.raw_score ||
              "N/A"
          }

          // Convert to percentage if it's a decimal
          if (typeof scoreValue === "number") {
            if (scoreValue <= 1) {
              scoreValue = Math.round(scoreValue * 100) + "%"
            } else {
              scoreValue = Math.round(scoreValue) + "%"
            }
          }

          output += `  • ${dimension.toUpperCase()}: ${scoreValue}\n`
        }
      )
    }

    return output.trim()
  }
}

// Make PersonalityStorage available globally for debugging
if (typeof window !== "undefined") {
  ;(window as any).PersonalityStorage = PersonalityStorage
}
