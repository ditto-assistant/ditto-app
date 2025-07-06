import React, { useState, useCallback } from "react"
import RewardNotification from "@/components/ui/RewardNotification"

interface RewardNotificationState {
  isVisible: boolean
  message: string
  key: number
}

export const useRewardNotification = () => {
  const [notification, setNotification] = useState<RewardNotificationState>({
    isVisible: false,
    message: "",
    key: 0,
  })

  const showReward = useCallback((message: string) => {
    setNotification((prev) => ({
      isVisible: true,
      message,
      key: prev.key + 1, // Force re-render for new animations
    }))
  }, [])

  const hideReward = useCallback(() => {
    setNotification((prev) => ({
      ...prev,
      isVisible: false,
    }))
  }, [])

  const RewardNotificationComponent = useCallback(() => {
    if (!notification.isVisible) return null

    return (
      <RewardNotification
        key={notification.key}
        message={notification.message}
        onComplete={hideReward}
        duration={2000}
      />
    )
  }, [notification, hideReward])

  return {
    showReward,
    RewardNotificationComponent,
  }
}
