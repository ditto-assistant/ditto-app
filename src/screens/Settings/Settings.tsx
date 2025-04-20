import { deleteUser, getAuth } from "firebase/auth"
import {
  removeUserFromFirestore,
  deleteAllUserScriptsFromFirestore,
} from "@/control/firebase"
import packageJson from "../../../package.json"
import { useAuth } from "@/hooks/useAuth"
import { clearStorage } from "@/utils/deviceId"
import Modal, { ModalTab } from "@/components/ui/modals/Modal"
import { useModal } from "@/hooks/useModal"
import { ModalButton } from "@/components/ui/buttons/ModalButton"
import { DeleteMemoryButton } from "@/components/ui/buttons/DeleteMemoryButton"
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog"
import { toast } from "sonner"
import { useMemo } from "react"
import ModelPreferencesModal from "@/screens/Settings/ModelPreferencesModal"
import MemoryControlsModal from "@/screens/Settings/MemoryControlsModal"
import AgentToolsModal from "@/screens/Settings/AgentToolsModal"
import SubscriptionTabContent from "@/screens/Settings/SubscriptionTabContent"
import {
  CreditCard,
  MemoryStick,
  Settings as SettingsIcon,
  Wrench,
  Crown,
  Skull,
} from "lucide-react"

export default function Settings() {
  const { signOut, user } = useAuth()
  const auth = getAuth()
  const { createCloseHandler, createOpenHandler } = useModal()
  const { showConfirmationDialog } = useConfirmationDialog()
  const openTokenModal = createOpenHandler("tokenCheckout")
  const closeModal = createCloseHandler("settings")

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
        variant: "primary",
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

      await deleteUser(currentUser)
      console.log("Account deleted")
      await removeUserFromFirestore(currentUser.uid)
      await deleteAllUserScriptsFromFirestore(currentUser.uid)
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
      variant: "danger",
    })
  }

  // Create the combined general and subscription tab content
  const generalTabContent = (
    <div className="p-4 flex flex-col gap-6 h-full">
      {/* Subscription Section */}
      <div className="flex-1">{subscriptionContent}</div>

      <div className="border-t my-2"></div>

      {/* Account Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Account</h3>
        <div className="flex flex-wrap gap-4">
          <ModalButton
            variant="primary"
            onClick={() => {
              closeModal()
              openTokenModal()
            }}
            fixedWidth
            icon={<CreditCard className="h-4 w-4" />}
          >
            BUY TOKENS
          </ModalButton>

          <ModalButton variant="secondary" onClick={handleLogout} fixedWidth>
            LOG OUT
          </ModalButton>
        </div>
      </div>

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
        <ModalButton variant="danger" onClick={openDeleteDialog} fixedWidth>
          DELETE ACCOUNT
        </ModalButton>
        <DeleteMemoryButton onSuccess={closeModal} fixedWidth />
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
