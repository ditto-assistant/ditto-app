import { deleteUser, getAuth } from "firebase/auth";
import {
  removeUserFromFirestore,
  deleteAllUserScriptsFromFirestore,
} from "@/control/firebase";
import packageJson from "../../../package.json";
import { useAuth } from "@/hooks/useAuth";
import { clearStorage } from "@/utils/deviceId";
import Modal, { ModalTab } from "@/components/ui/modals/Modal";
import { useModal } from "@/hooks/useModal";
import { ModalButton } from "@/components/ui/buttons/ModalButton";
import { DeleteMemoryButton } from "@/components/ui/buttons/DeleteMemoryButton";
import { FaCreditCard } from "react-icons/fa";
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog";
import "./Settings.css";
import toast from "react-hot-toast";
import { useMemo } from "react";
import ModelPreferencesModal from "@/screens/Settings/ModelPreferencesModal";
import MemoryControlsModal from "@/screens/Settings/MemoryControlsModal";
import AgentToolsModal from "@/screens/Settings/AgentToolsModal";
import SubscriptionTabContent from "@/screens/Settings/SubscriptionTabContent";
import { BiMemoryCard } from "react-icons/bi";
import { MdSettings } from "react-icons/md";
import { FaTools, FaCrown, FaSkull } from "react-icons/fa";

export default function Settings() {
  const { signOut, user } = useAuth();
  const auth = getAuth();
  const { createCloseHandler, createOpenHandler } = useModal();
  const { showConfirmationDialog } = useConfirmationDialog();
  const closeModal = createCloseHandler("settings");
  const openTokenModal = createOpenHandler("tokenCheckout");

  // Memoize the modal components
  const modelPreferences = useMemo(() => <ModelPreferencesModal />, []);
  const memoryControls = useMemo(() => <MemoryControlsModal />, []);
  const agentTools = useMemo(() => <AgentToolsModal />, []);
  const subscriptionContent = useMemo(() => <SubscriptionTabContent />, []);

  const handleLogout = () => {
    console.log("logging out");
    const hasSeenTOS = localStorage.getItem("hasSeenTOS");
    localStorage.clear();
    if (hasSeenTOS) {
      localStorage.setItem("hasSeenTOS", hasSeenTOS);
    }
    signOut();
    closeModal();
  };

  const handleDeleteAccount = async () => {
    if (!user) {
      console.error("No user currently signed in");
      alert("You are not currently signed in. Please sign in and try again.");
      handleLogout();
      return;
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
      });

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Firebase auth user not found");
      }

      const metadata = currentUser.metadata;
      // Handle case where lastSignInTime might be undefined
      const lastSignInTime = metadata.lastSignInTime
        ? new Date(metadata.lastSignInTime).getTime()
        : 0;
      const now = new Date().getTime();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - lastSignInTime > fiveMinutes) {
        openReauthenticationDialog();
        return;
      }

      await deleteUser(currentUser);
      console.log("Account deleted");
      await removeUserFromFirestore(currentUser.uid);
      await deleteAllUserScriptsFromFirestore(currentUser.uid);
      clearStorage();
      closeModal();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error deleting account: ", error);
        if (error.message === "auth/requires-recent-login") {
          openReauthenticationDialog();
        } else {
          toast.error(`Error deleting account: ${error.message}`);
        }
      } else {
        console.error("Error deleting account: ", error);
      }
    }
  };

  const openDeleteDialog = () => {
    showConfirmationDialog({
      title: "Confirm Account Deletion",
      content:
        "Are you sure you want to delete your account? This action cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      onConfirm: handleDeleteAccount,
      variant: "danger",
    });
  };

  // Create the combined general and subscription tab content
  const generalTabContent = (
    <div className="settings-content">
      {/* Subscription Section */}
      <div className="subscription-section">{subscriptionContent}</div>

      <div className="settings-divider"></div>

      {/* Account Section */}
      <div className="account-section">
        <h3 className="settings-section-title">Account</h3>
        <div className="settings-options">
          <ModalButton variant="secondary" onClick={handleLogout} fixedWidth>
            LOG OUT
          </ModalButton>
        </div>
      </div>

      <footer className="settings-footer">
        <div className="version-container">
          <small>Version: {packageJson.version}</small>
        </div>
      </footer>
    </div>
  );

  // Create the tab content for the danger zone
  const dangerTabContent = (
    <div className="danger-content">
      <div className="danger-description">
        <p>
          Warning: Actions in this section can result in irreversible data loss.
        </p>
      </div>
      <div className="danger-buttons">
        <ModalButton variant="danger" onClick={openDeleteDialog} fixedWidth>
          DELETE ACCOUNT
        </ModalButton>
        <div className="memory-manager-container">
          <DeleteMemoryButton onSuccess={closeModal} fixedWidth />
        </div>
      </div>
    </div>
  );

  // Define the tabs with icons
  const modalTabs: ModalTab[] = [
    {
      id: "general",
      label: "Account",
      content: generalTabContent,
      icon: <FaCrown />,
    },
    {
      id: "models",
      label: "Models",
      content: modelPreferences,
      minimumTier: 1,
      icon: <MdSettings />,
    },
    {
      id: "memory",
      label: "Memory",
      content: memoryControls,
      minimumTier: 1,
      icon: <BiMemoryCard />,
    },
    {
      id: "tools",
      label: "Tools",
      content: agentTools,
      minimumTier: 1,
      icon: <FaTools />,
    },
    {
      id: "danger",
      label: "Danger Zone",
      content: dangerTabContent,
      customClass: "danger",
      icon: <FaSkull />,
    },
  ];

  return (
    <Modal
      id="settings"
      title="Settings"
      fullScreen={true}
      tabs={modalTabs}
      defaultTabId="general"
    >
      {/* Footer will be conditionally rendered in each tab's content */}
    </Modal>
  );
}
