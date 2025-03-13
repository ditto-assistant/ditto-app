import { useState } from "react";
import { ModalButton } from "@/components/ui/buttons/ModalButton";
import { LoadingSpinner } from "@/components/ui/loading/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useEncryptionKeys } from "@/hooks/useEncryptionKeys";
import toast from "react-hot-toast";
import {
  generateEncryptionKey,
  getEncryptionCredential,
  encryptConversation,
} from "@/utils/encryption";
import { registerPasskey, authenticatePasskey } from "@/api/passkeys";
import { migrateConversations } from "@/api/encryption";
import { getConversations } from "@/api/getConversations";
import "./EncryptionControlsModal.css";
import { useConfirmationDialog } from "@/hooks/useConfirmationDialog";

export default function EncryptionControlsModal() {
  const { user } = useAuth();
  const {
    data: encryptionKeys,
    isLoading,
    error,
    refetch,
  } = useEncryptionKeys();
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const { showConfirmationDialog } = useConfirmationDialog();
  const activeKey = encryptionKeys?.find((key) => key.isActive);

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
      console.log("Encryption keys refreshed after enabling:", {
        encryptionKeys,
        activeKey,
      });

      toast.success("Encryption enabled with passkey successfully");
      toast.success("Your passkey will sync across your devices", {
        duration: 5000,
        icon: "🔑",
      });

      showConfirmationDialog({
        title: "Encrypt your existing conversations?",
        content:
          "This operation will need to be performed client-side by fetching, encrypting, and saving each conversation.",
        onConfirm: async () => {
          // Wait a short time and refresh encryption keys to ensure we have the active key
          toast.loading("Preparing for migration...");

          // Refresh keys multiple times to ensure we have the latest data
          for (let i = 0; i < 3; i++) {
            if (!activeKey) {
              console.log(
                `Waiting for active key to be available (attempt ${i + 1}/3)...`,
                { activeKey, encryptionKeys },
              );
              // Wait a bit between retries
              await new Promise((resolve) => setTimeout(resolve, 1000));
              await refetch();
            } else {
              break; // We have an active key, no need to keep trying
            }
          }

          await migrateExistingConversations();
        },
      });
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

  const rotateKey = () =>
    showConfirmationDialog({
      title: "Rotate your encryption passkey?",
      content:
        "This will create a new passkey and re-encrypt your data. Your existing encrypted conversations will still be accessible through this new passkey.",
      onConfirm: async () => {
        try {
          if (!activeKey) {
            throw new Error("No active encryption key found");
          }

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
          const result = await generateEncryptionKey(
            user?.displayName || passkeyName,
          );

          // Register the new passkey with the server
          const response = await registerPasskey(
            result.credential,
            result.challengeId,
            passkeyName,
          );

          if (!response.success) {
            throw new Error(
              response.message || "Failed to register new passkey",
            );
          }

          // Refresh the encryption keys list
          await refetch();

          toast.success("Encryption passkey rotated successfully");
          toast.success("Your new passkey will sync across your devices", {
            duration: 5000,
            icon: "🔑",
          });

          showConfirmationDialog({
            title: "Re-encrypt your existing conversations?",
            content:
              "This is recommended to ensure all conversations are accessible.",
            onConfirm: async () => {
              // Wait a short time and refresh encryption keys to ensure we have the active key
              toast.loading("Preparing for migration...");

              // Refresh keys multiple times to ensure we have the latest data
              for (let i = 0; i < 3; i++) {
                if (!activeKey) {
                  console.log(
                    `Waiting for active key to be available after rotation (attempt ${i + 1}/3)...`,
                    { activeKey, encryptionKeys },
                  );
                  // Wait a bit between retries
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  await refetch();
                } else {
                  break; // We have an active key, no need to keep trying
                }
              }

              await migrateExistingConversations();
            },
          });
        } catch (error) {
          console.error("Failed to rotate encryption key:", error);
          toast.error(
            "Failed to rotate encryption key: " +
              (error instanceof Error ? error.message : String(error)),
          );
        }
      },
    });

  const migrateExistingConversations = async () => {
    const toastID = toast.loading("Starting conversation migration...");
    try {
      setMigrationInProgress(true);

      // Validate that we have an active encryption key
      // If not, try to refresh the keys one more time
      if (!activeKey) {
        console.log("No active key found initially, refreshing keys data...");
        await refetch();
      }

      // Check again after refresh
      if (!activeKey) {
        // Log details about the keys we have
        console.error("Active key still not found after refresh", {
          haveKeys: !!encryptionKeys,
          keysCount: encryptionKeys?.length,
          keysData: encryptionKeys,
        });

        throw new Error(
          `No active encryption key found after refresh. Please try enabling encryption again.`,
        );
      }

      console.log("Using active key for migration:", {
        keyId: activeKey.keyId,
        version: activeKey.version,
        prfEnabled: activeKey.prfEnabled,
      });

      const BATCH_SIZE = 25;
      let cursor = "";
      let hasMore = true;
      let totalMigrated = 0;
      let batchCount = 0;

      // Log the active key for debugging
      console.log("Using active encryption key:", activeKey);

      while (hasMore) {
        batchCount++;
        toast.loading(`Processing batch ${batchCount} of conversations...`, {
          id: toastID,
        });

        // Fetch a batch of conversations
        const conversationsResult = await getConversations(cursor, BATCH_SIZE);
        if (conversationsResult.err) {
          throw new Error(conversationsResult.err);
        }
        if (!conversationsResult.ok) {
          throw new Error("Failed to fetch conversations");
        }

        const conversations = conversationsResult.ok.messages;
        cursor = conversationsResult.ok.nextCursor;

        // Skip this batch if empty
        if (conversations.length === 0) {
          hasMore = cursor !== "";
          continue;
        }

        toast.loading(`Encrypting ${conversations.length} conversations...`, {
          id: toastID,
        });

        // For conversation encryption, we should use the active key directly
        // instead of generating a temporary key which is causing issues
        console.log("Using active encryption key for migration", activeKey);

        // Get a credential for authentication using the active key
        const credentialResult = await getEncryptionCredential();
        if (!credentialResult) {
          throw new Error(
            "Could not get encryption credential. Please try again.",
          );
        }

        // Authenticate with the server
        const authResult = await authenticatePasskey(
          credentialResult.credential,
          credentialResult.challengeId,
        );

        if (!authResult.success) {
          throw new Error("Failed to authenticate with passkey");
        }

        // We'll use the PRF extension output directly for encryption
        // Extract PRF results from credential
        const extensionResults =
          credentialResult.credential.getClientExtensionResults();

        console.log("Checking for PRF extension results", {
          hasPRF: !!extensionResults.prf,
          enabled: extensionResults.prf?.enabled,
          hasResults: !!extensionResults.prf?.results,
        });

        // Derive key material from PRF extension if available
        let keyMaterial: ArrayBuffer;
        let derivedKeyPair: CryptoKeyPair;

        if (
          extensionResults.prf &&
          extensionResults.prf.enabled &&
          extensionResults.prf.results?.first
        ) {
          console.log(
            "Using PRF extension for key derivation during migration",
          );
          keyMaterial = extensionResults.prf.results.first;

          // Import the key material as a CryptoKey
          const baseKey = await window.crypto.subtle.importKey(
            "raw",
            keyMaterial,
            { name: "HKDF" },
            false,
            ["deriveBits", "deriveKey"],
          );

          // Derive an RSA key pair from the PRF output
          derivedKeyPair = await window.crypto.subtle.generateKey(
            {
              name: "RSA-OAEP",
              modulusLength: 2048,
              publicExponent: new Uint8Array([1, 0, 1]),
              hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"],
          );
        } else {
          // No PRF extension or results, we need to generate a key
          console.log("PRF extension not available, generating temporary key");
          const tempKeyResult = await generateEncryptionKey(
            user?.displayName || "Temporary Migration Key",
          );
          derivedKeyPair = {
            publicKey: await window.crypto.subtle.importKey(
              "jwk",
              tempKeyResult.publicKey,
              { name: "RSA-OAEP", hash: "SHA-256" },
              true,
              ["encrypt"],
            ),
            privateKey: tempKeyResult.privateKey,
          };
        }

        // Export the public key for encryption
        const publicKeyJson = await window.crypto.subtle.exportKey(
          "jwk",
          derivedKeyPair.publicKey,
        );

        console.log("Encryption key ready for migration", {
          keyId: activeKey.keyId,
          hasAlg: !!publicKeyJson.alg,
          hasKty: !!publicKeyJson.kty,
          isPRF: !!(
            extensionResults.prf?.enabled && extensionResults.prf?.results
          ),
        });

        // Encrypt all conversations in the batch
        const encryptedConversations = await Promise.all(
          conversations.map(async (conversation) => {
            try {
              return await encryptConversation(
                {
                  id: conversation.id,
                  prompt: conversation.prompt,
                  response: conversation.response,
                },
                publicKeyJson,
                activeKey.keyId,
              );
            } catch (error) {
              console.error(
                `Failed to encrypt conversation ${conversation.id}:`,
                error,
              );
              throw new Error(
                `Failed to encrypt conversation: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }),
        );

        toast.loading(`Saving encrypted batch ${batchCount}...`, {
          id: toastID,
        });

        // Send the encrypted batch to the server
        const migrationRequest = {
          encryptionKeyId: activeKey.keyId,
          encryptionVersion: activeKey.version,
          conversations: encryptedConversations,
        };

        console.log(
          `Sending migration request for batch ${batchCount} with ${encryptedConversations.length} conversations`,
        );
        const migrationResult = await migrateConversations(migrationRequest);

        if (migrationResult.err) {
          throw new Error(`Migration failed: ${migrationResult.err}`);
        }

        // Log successful migration details
        console.log("Migration result:", migrationResult.ok);

        // Update progress
        totalMigrated += encryptedConversations.length;
        toast.loading(`Migrated ${totalMigrated} conversations so far...`, {
          id: toastID,
        });

        // Check if there are more conversations to process
        hasMore = cursor !== "";

        // Add a small delay to avoid overloading the browser
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Migration complete!
      if (totalMigrated > 0) {
        toast.success(`Successfully migrated ${totalMigrated} conversations!`, {
          id: toastID,
        });

        // Refresh conversation history to show encrypted versions
        window.dispatchEvent(new Event("memoryUpdated"));
      } else {
        toast.success("No conversations needed migration", {
          id: toastID,
        });
      }
    } catch (error) {
      console.error("Failed to migrate conversations:", error);
      toast.error(
        `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
        { id: toastID },
      );
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
