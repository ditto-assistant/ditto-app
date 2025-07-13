import { useState, useEffect, useCallback } from "react"
import { auth } from "@/lib/firebase"
import { routes } from "@/firebaseConfig"
import { PersonalityStorage } from "@/utils/personalityStorage"
import { PersonalityAssessment } from "../types/assessmentTypes"

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

  const fetchAssessmentsFromAPI = useCallback(async () => {
    if (!userId) return []

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
    return data.assessments || []
  }, [userId])

  const fetchAssessments = useCallback(
    async (forceRefresh = false) => {
      if (!userId) {
        setAssessments([])
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Try to get from localStorage first (unless force refresh)
        if (!forceRefresh) {
          const cachedAssessments = PersonalityStorage.get(userId)
          if (cachedAssessments) {
            setAssessments(cachedAssessments)
            setLoading(false)
            return
          }
        }

        // Fetch from API if no cache or force refresh
        const apiAssessments = await fetchAssessmentsFromAPI()

        // Update localStorage with fresh data
        PersonalityStorage.set(userId, apiAssessments)

        setAssessments(apiAssessments)
      } catch (err) {
        console.error("Error fetching personality assessments:", err)
        setError(
          err instanceof Error ? err.message : "Failed to fetch assessments"
        )

        // On error, try to fall back to cached data if available
        const cachedAssessments = PersonalityStorage.get(userId)
        if (cachedAssessments) {
          setAssessments(cachedAssessments)
        } else {
          setAssessments([])
        }
      } finally {
        setLoading(false)
      }
    },
    [userId, fetchAssessmentsFromAPI]
  )

  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  // Method to force refresh from API
  const refetch = useCallback(() => {
    return fetchAssessments(true)
  }, [fetchAssessments])

  // Method to update assessments (for when sync completes)
  const updateAssessments = useCallback(
    (newAssessments: PersonalityAssessment[]) => {
      if (userId) {
        PersonalityStorage.set(userId, newAssessments)
        setAssessments(newAssessments)
      }
    },
    [userId]
  )

  return {
    assessments,
    loading,
    error,
    refetch,
    updateAssessments,
  }
}
