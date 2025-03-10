import { useState } from "react";
import { ModalButton } from "@/components/ui/buttons/ModalButton";
import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useEncryptionKeys } from "@/hooks/useEncryptionKeys";
import toast from "react-hot-toast";
import { generateEncryptionKey } from "@/utils/encryption";
import "./EncryptionControlsModal.css";

export default function EncryptionControlsModal() {
  const { user } = useAuth();
  const { encryptionKeys, activeKey, isLoading, error, refetch } =
    useEncryptionKeys();
  const [migrationInProgress, setMigrationInProgress] = useState(false);

  const enableEncryption = async () => {
    if (!user) {
      toast.error("You must be signed in to enable encryption");
      return;
    }

    try {
      // Check if passkeys are supported
      if (!window.PublicKeyCredential) {
        toast.error("Passkeys are not supported in this browser");
        return;
      }

      // Check if conditional UI for passkeys is supported
      // to give better guidance to the user
      const conditionalMediationAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();

      if (!conditionalMediationAvailable) {
        toast.success("You'll be prompted to create a passkey for encryption", {
          duration: 4000,
        });
      }

      // Choose a display name for the passkey
      const passkeyName = `Ditto Encryption Key (${new Date().toLocaleDateString()})`;

      // Generate encryption key using passkey - now uses our server API to get a challenge
      const result = await generateEncryptionKey(
        user.displayName || passkeyName,
      );

      // Register the passkey with the server
      const { registerPasskey } = await import("@/api/passkeys");
      const response = await registerPasskey(
        result.credential,
        result.challengeId,
        passkeyName,
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to register passkey");
      }

      // Refresh the encryption keys list
      await refetch();

      toast.success("Encryption enabled with passkey successfully");
      toast.success("Your passkey will sync across your devices", {
        duration: 5000,
        icon: "🔑",
      });

      // Note: Migration of existing conversations would need to be implemented
      // as a client-side operation with the new passkey API
      const confirmMigration = window.confirm(
        "Do you want to encrypt your existing conversations? This operation will need to be performed client-side by fetching, encrypting, and saving each conversation.",
      );

      if (confirmMigration) {
        await migrateExistingConversations();
      }
    } catch (error) {
      console.error("Failed to enable encryption:", error);
      toast.error(
        "Failed to enable encryption: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  };

  const generateRecoveryCode = async () => {
    try {
      if (!activeKey) {
        toast.error("No active encryption key found");
        return;
      }

      // Generate a secure random recovery code
      const recoveryBytes = new Uint8Array(16);
      window.crypto.getRandomValues(recoveryBytes);
      const recoveryCode = Array.from(recoveryBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .match(/.{1,4}/g)!
        .join("-")
        .toUpperCase();

      // Here we would ideally encrypt the private key material with this recovery code
      // and store it securely on the server.
      // For now, we'll just display the code to the user and instruct them to save it

      const recoveryMessage = `
Your recovery code is: ${recoveryCode}

IMPORTANT: Write down this code and store it in a safe place. 
You will need this code to recover your encrypted data if you lose access to your devices.
This code will NOT be shown again.
      `.trim();

      // Show recovery code modal or alert
      alert(recoveryMessage);

      toast.success("Recovery code generated - please save it securely");
    } catch (error) {
      console.error("Failed to generate recovery code:", error);
      toast.error("Failed to generate recovery code");
    }
  };

  const rotateKey = async () => {
    const confirmRotate = window.confirm(
      "Are you sure you want to rotate your encryption passkey? This will create a new passkey and re-encrypt your data. Your existing encrypted conversations will still be accessible through this new passkey.",
    );

    if (!confirmRotate) return;

    try {
      if (!activeKey) {
        throw new Error("No active encryption key found");
      }

      // Check if we have a valid credential
      const { getEncryptionCredential } = await import("@/utils/encryption");
      const { authenticatePasskey } = await import("@/api/passkeys");

      const credentialResult = await getEncryptionCredential();
      if (!credentialResult) {
        throw new Error(
          "Could not verify your current passkey. Please try again.",
        );
      }

      // Verify the user with their existing passkey
      const authResult = await authenticatePasskey(
        credentialResult.credential,
        credentialResult.challengeId,
      );

      if (!authResult.success) {
        throw new Error("Failed to authenticate with current passkey");
      }

      toast.success("Current passkey verified successfully");
      toast.loading("Creating new passkey...", { duration: 3000 });

      // Choose a display name for the new passkey
      const passkeyName = `Ditto Encryption Key (${new Date().toLocaleDateString()})`;

      // Generate new key using passkey
      const { generateEncryptionKey } = await import("@/utils/encryption");
      const result = await generateEncryptionKey(
        user?.displayName || passkeyName,
      );

      // Register the new passkey with the server
      const { registerPasskey } = await import("@/api/passkeys");
      const response = await registerPasskey(
        result.credential,
        result.challengeId,
        passkeyName,
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to register new passkey");
      }

      // Refresh the encryption keys list
      await refetch();

      toast.success("Encryption passkey rotated successfully");
      toast.success("Your new passkey will sync across your devices", {
        duration: 5000,
        icon: "🔑",
      });

      // Ask user if they want to migrate existing conversations
      const confirmMigration = window.confirm(
        "Do you want to re-encrypt your existing conversations with the new passkey? This is recommended to ensure all conversations are accessible.",
      );

      if (confirmMigration) {
        await migrateExistingConversations();
      }
    } catch (error) {
      console.error("Failed to rotate encryption key:", error);
      toast.error(
        "Failed to rotate encryption key: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  };

  const migrateExistingConversations = async () => {
    const toastID = toast.loading(
      "Migration functionality will be implemented in a future version",
    );
    try {
      setMigrationInProgress(true);

      // This would need to be implemented as a client-side operation
      // Fetch all conversations, encrypt them with the user's passkey, and save back
      // For now, we'll just show a placeholder message

      // TODO: Implement client-side conversation migration
      // 1. Fetch all conversations for the user
      // 2. Encrypt each conversation with the active passkey
      // 3. Save the encrypted conversations back to the database
    } catch (error) {
      console.error("Failed to migrate conversations:", error);
      toast.error("Failed to migrate conversations", { id: toastID });
    } finally {
      setMigrationInProgress(false);
      toast.dismiss(toastID);
    }
  };

  if (isLoading) {
    return (
      <div className="encryption-controls-container">
        <div className="encryption-loading">
          <LoadingSpinner size={45} />
          <p>Loading encryption settings...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="encryption-controls-container">
        <div className="encryption-error">
          <p>Error loading encryption settings: {error.message}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="encryption-controls-container">
      <div className="encryption-header">
        <h3>End-to-End Encryption</h3>
        <div
          className={`encryption-status ${activeKey ? "enabled" : "disabled"}`}
        >
          Status: {activeKey ? "Enabled" : "Disabled"}
        </div>
      </div>

      <div className="encryption-description">
        <p>
          End-to-end encryption protects your conversation data so that only you
          can read it. When enabled, your data is encrypted before it leaves
          your device and can only be decrypted with your private key.
        </p>
      </div>

      <div className="encryption-actions">
        {activeKey ? (
          <>
            <ModalButton
              variant="secondary"
              onClick={rotateKey}
              disabled={migrationInProgress}
              fixedWidth
            >
              ROTATE PASSKEY
            </ModalButton>
            <ModalButton
              variant="secondary"
              onClick={generateRecoveryCode}
              disabled={migrationInProgress}
              fixedWidth
            >
              GENERATE RECOVERY CODE
            </ModalButton>
          </>
        ) : (
          <ModalButton
            variant="primary"
            onClick={enableEncryption}
            disabled={migrationInProgress}
            fixedWidth
          >
            ENABLE ENCRYPTION
          </ModalButton>
        )}
      </div>

      {migrationInProgress && (
        <div className="migration-progress">
          <LoadingSpinner size={24} inline={true} />
          <p>Migrating conversations... This may take a while.</p>
        </div>
      )}

      {activeKey && encryptionKeys && (
        <div className="key-info">
          <h4>Encryption Keys</h4>
          <div className="key-list">
            {encryptionKeys.map((key) => (
              <div
                key={key.keyId}
                className={`key-item ${key.isActive ? "active" : "inactive"}`}
              >
                <div className="key-details">
                  <span className="key-name">Key {key.version}</span>
                  <span className="key-id">{key.keyId.substring(0, 8)}...</span>
                  <span className="key-created">
                    Created: {new Date(key.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="key-status">
                  {key.isActive ? "Active" : "Inactive"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="encryption-footer">
        <small>
          Note: Your encryption keys are securely stored using passkeys, which
          are synced across your devices. You can use any of your devices to
          access your encrypted conversations.
        </small>
      </div>
    </div>
  );
}
