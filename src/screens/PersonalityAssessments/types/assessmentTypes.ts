// Big Five personality assessment types
export interface BigFiveResults {
  dimension_scores: {
    [key: string]: {
      name: string
      score: number
      level: string
      description?: string
      percentile?: number
    }
  }
  summary: string
  descriptions: string[]
}

// MBTI personality assessment types
export interface MBTIResults {
  personality_type: string
  type_description: string
  dimension_details: {
    [key: string]: {
      preference: string
      strength: number
    }
  }
}

// DISC personality assessment types
export interface DISCResults {
  profile_summary: string
  profile_description: string
  dimension_scores: {
    [key: string]: {
      name: string
      score: number
      percentage: number
    }
  }
  primary_style: {
    id: string
    name: string
    description: string
  }
  secondary_style: {
    id: string
    name: string
    description: string
  }
}

// Union type for all assessment results
export type AssessmentResults = BigFiveResults | MBTIResults | DISCResults

// Assessment answers - keeping as Record for flexibility since the structure varies
export type AssessmentAnswers = Record<string, unknown>

// Main personality assessment interface
export interface PersonalityAssessment {
  assessment_id: string
  session_id: string
  name: string
  description: string
  completed_at: string | null
  results: AssessmentResults
  answers: AssessmentAnswers
  questions_answered: number
  started_at: number
  completed: boolean
}