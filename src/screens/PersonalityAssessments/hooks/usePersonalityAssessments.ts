import { useState, useEffect, useCallback } from "react"
import { auth } from "@/lib/firebase"
import { routes } from "@/firebaseConfig"

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

interface PersonalityAssessmentsResponse {
  assessments: PersonalityAssessment[]
  metadata: {
    user_id: string
    total_count: number
  }
}

export function usePersonalityAssessments(userId: string | undefined) {
  const [assessments, setAssessments] = useState<PersonalityAssessment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAssessments = useCallback(async () => {
    if (!userId) {
      setAssessments([])
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const user = auth.currentUser
      if (!user) {
        throw new Error("User not authenticated")
      }

      const token = await user.getIdToken()

      const response = await fetch(routes.personalityAssessments, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      const data: PersonalityAssessmentsResponse = await response.json()
      setAssessments(data.assessments || [])
    } catch (err) {
      console.error("Error fetching personality assessments:", err)
      setError(
        err instanceof Error ? err.message : "Failed to fetch assessments"
      )
      setAssessments([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  return {
    assessments,
    loading,
    error,
    refetch: fetchAssessments,
  }
}
