import { useState } from "react";
import { deleteUser, getAuth } from "firebase/auth";
import {
  removeUserFromFirestore,
  deleteAllUserScriptsFromFirestore,
} from "@/control/firebase";
import packageJson from "../../package.json";
import { useBalance } from "@/hooks/useBalance";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { clearStorage } from "@/utils/deviceId";
import Modal, { ModalTab } from "@/components/ui/modals/Modal";
import { useModal } from "@/hooks/useModal";
import { ModalButton } from "@/components/ui/buttons/ModalButton";
import { DeleteMemoryButton } from "@/components/ui/buttons/DeleteMemoryButton";
import { ConfirmationDialog } from "@/components/ui/dialogs/ConfirmationDialog";
import "./Settings.css";
import toast from "react-hot-toast";

export default function Settings() {
  const balance = useBalance();
  const { signOut, user } = useAuth();
  const auth = getAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [reAuthDialogOpen, setReAuthDialogOpen] = useState<boolean>(false);
  const { createCloseHandler } = useModal();
  const closeModal = createCloseHandler("settings");

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
        setDeleteDialogOpen(false);
        setReAuthDialogOpen(true);
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
          setDeleteDialogOpen(false);
          setReAuthDialogOpen(true);
        } else {
          toast.error(`Error deleting account: ${error.message}`);
        }
      } else {
        console.error("Error deleting account: ", error);
      }
    }
  };

  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
  };

  // Create the tab content for the main settings
  const generalTabContent = (
    <div className="settings-content">
      <div className="tokens-info">
        {!balance.isLoading ? (
          <>
            <p className="balance-item">
              Ditto Tokens:{" "}
              <span className="highlight-text">{balance.data?.balance}</span>
            </p>
            <p className="balance-item">
              Images:{" "}
              <span className="highlight-text">{balance.data?.images}</span>
            </p>
            <p className="balance-item">
              Searches:{" "}
              <span className="highlight-text">{balance.data?.searches}</span>
            </p>
          </>
        ) : (
          <div className="spinner-container">
            <LoadingSpinner size={45} inline={true} />
          </div>
        )}
      </div>
      <div className="settings-options">
        <ModalButton
          variant="primary"
          onClick={() => (window.location.href = "/checkout")}
          fixedWidth
        >
          ADD TOKENS
        </ModalButton>
        <ModalButton variant="secondary" onClick={handleLogout} fixedWidth>
          LOG OUT
        </ModalButton>
      </div>
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

  // Define the tabs
  const modalTabs: ModalTab[] = [
    {
      id: "general",
      label: "General",
      content: generalTabContent,
    },
    {
      id: "danger",
      label: "Danger Zone",
      content: dangerTabContent,
      customClass: "danger",
    },
  ];

  return (
    <Modal
      id="settings"
      title="Settings"
      fullScreen
      tabs={modalTabs}
      defaultTabId="general"
    >
      <footer className="settings-footer">
        <div className="version-container">
          <small>Version: {packageJson.version}</small>
        </div>
      </footer>

      <ConfirmationDialog
        isOpen={reAuthDialogOpen}
        onClose={() => setReAuthDialogOpen(false)}
        title="Re-authentication Required"
        message="For security reasons, you need to sign in again before deleting your account. Would you like to sign out now?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        onConfirm={() => {
          setReAuthDialogOpen(false);
          handleLogout();
        }}
        variant="primary"
      />

      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={closeDeleteDialog}
        title="Confirm Account Deletion"
        message="Are you sure you want to delete your account? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteAccount}
        variant="danger"
      />
    </Modal>
  );
}
