// External dependencies
import { deleteUser, getAuth } from "firebase/auth"
import { toast } from "sonner"
import { useMemo } from "react"
import {
  MemoryStick,
  Settings as SettingsIcon,
  Wrench,
  Crown,
  Skull,
} from "lucide-react"
// Internal utilities & hooks
import { deleteUserAccount } from "@/api/userContent"
import { clearStorage } from "@/utils/deviceId"
import { useAuth } from "@/hooks/useAuth"
import { useModal } from "@/hooks/useModal"
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog"
import { useFontSize } from "@/hooks/useFontSize"
// UI Components
import Modal, { ModalTab } from "@/components/ui/modals/Modal"
import { ModalButton } from "@/components/ui/buttons/ModalButton"
// Settings Components
import ModelPreferencesModal from "@/components/model-preferences/ModelPreferencesModal"
import MemoryControlsModal from "@/screens/Settings/MemoryControlsModal"
import AgentToolsModal from "@/screens/Settings/AgentToolsModal"
import SubscriptionTabContent from "@/screens/Settings/SubscriptionTabContent"
// Config
import packageJson from "../../../package.json"

export default function Settings() {
  const { signOut, user } = useAuth()
  const auth = getAuth()
  const { createCloseHandler } = useModal()
  const { showConfirmationDialog } = useConfirmationDialog()
  const closeModal = createCloseHandler("settings")
  const { fontSize, setFontSize } = useFontSize()

  // Memoize the modal components
  const modelPreferences = useMemo(() => <ModelPreferencesModal />, [])
  const memoryControls = useMemo(() => <MemoryControlsModal />, [])
  const agentTools = useMemo(() => <AgentToolsModal />, [])
  const subscriptionContent = useMemo(() => <SubscriptionTabContent />, [])

  const handleLogout = () => {
    console.log("logging out")
    const hasSeenTOS = localStorage.getItem("hasSeenTOS")
    localStorage.clear()
    if (hasSeenTOS) {
      localStorage.setItem("hasSeenTOS", hasSeenTOS)
    }
    signOut()
    closeModal()
  }

  const handleDeleteAccount = async () => {
    if (!user) {
      console.error("No user currently signed in")
      toast.error(
        "You are not currently signed in. Please sign in and try again."
      )
      handleLogout()
      return
    }

    const openReauthenticationDialog = () =>
      showConfirmationDialog({
        title: "Re-authentication Required",
        content:
          "For security reasons, you need to sign in again before deleting your account. Would you like to sign out now?",
        confirmLabel: "Sign Out",
        cancelLabel: "Cancel",
        onConfirm: handleLogout,
        variant: "default",
      })

    try {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new Error("Firebase auth user not found")
      }

      const metadata = currentUser.metadata
      // Handle case where lastSignInTime might be undefined
      const lastSignInTime = metadata.lastSignInTime
        ? new Date(metadata.lastSignInTime).getTime()
        : 0
      const now = new Date().getTime()
      const fiveMinutes = 5 * 60 * 1000

      if (now - lastSignInTime > fiveMinutes) {
        openReauthenticationDialog()
        return
      }

      // Delete user data from backend first (while still authenticated)
      const result = await deleteUserAccount(currentUser.uid)
      if (result instanceof Error) {
        console.error("Error deleting user data:", result)
        toast.error("Failed to delete user data")
        return
      }
      
      // Then delete the Firebase user account
      await deleteUser(currentUser)
      console.log("Account deleted")
      clearStorage()
      closeModal()
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error deleting account: ", error)
        if (error.message === "auth/requires-recent-login") {
          openReauthenticationDialog()
        } else {
          toast.error(`Error deleting account: ${error.message}`)
        }
      } else {
        console.error("Error deleting account: ", error)
      }
    }
  }

  const openDeleteDialog = () => {
    showConfirmationDialog({
      title: "Confirm Account Deletion",
      content:
        "Are you sure you want to delete your account? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: handleDeleteAccount,
      variant: "destructive",
    })
  }

  // Create the combined general and subscription tab content
  const generalTabContent = (
    <div className="p-4 flex flex-col gap-6 h-full">
      {/* Subscription Section */}
      <div className="flex-1">{subscriptionContent}</div>

      {/* Font Size Setting */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-2">Font Size</h3>
        <div className="flex gap-2">
          {["small", "medium", "large"].map((size) => (
            <button
              key={size}
              onClick={() => setFontSize(size as "small" | "medium" | "large")}
              className={`px-3 py-1.5 rounded-md text-sm ${
                fontSize === size
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {size.charAt(0).toUpperCase() + size.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t my-2"></div>

      <footer className="mt-auto pt-4">
        <div className="text-muted-foreground text-sm text-center">
          Version: {packageJson.version}
        </div>
      </footer>
    </div>
  )

  // Create the tab content for the danger zone
  const dangerTabContent = (
    <div className="p-4 space-y-6">
      <div className="bg-destructive/10 p-4 rounded-md text-sm text-destructive">
        <p>
          Warning: Actions in this section can result in irreversible data loss.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <ModalButton
          variant="destructive"
          onClick={openDeleteDialog}
          fixedWidth
        >
          DELETE ACCOUNT
        </ModalButton>
      </div>
    </div>
  )

  // Define the tabs with icons
  const modalTabs: ModalTab[] = [
    {
      id: "general",
      label: "Account",
      content: generalTabContent,
      icon: <Crown className="h-4 w-4" />,
    },
    {
      id: "models",
      label: "Models",
      content: modelPreferences,
      icon: <SettingsIcon className="h-4 w-4" />,
    },
    {
      id: "memory",
      label: "Memory",
      content: memoryControls,
      minimumTier: 1,
      icon: <MemoryStick className="h-4 w-4" />,
    },
    {
      id: "tools",
      label: "Tools",
      content: agentTools,
      minimumTier: 1,
      icon: <Wrench className="h-4 w-4" />,
    },
    {
      id: "danger",
      label: "Danger Zone",
      content: dangerTabContent,
      customClass: "danger",
      icon: <Skull className="h-4 w-4" />,
    },
  ]

  return (
    <Modal
      id="settings"
      title="Settings"
      tabs={modalTabs}
      defaultTabId="general"
      notResizable={false}
    />
  )
}
