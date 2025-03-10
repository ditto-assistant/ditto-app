import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  encryptData, 
  decryptWithPasskey, 
  isEncryptionEnabled, 
  getActiveEncryptionKey, 
  EncryptedData 
} from "@/utils/encryption";
import { getEncryptionHeaders } from "@/api/encryption";

/**
 * Hook for handling encrypted conversations
 * Provides encryption/decryption functionality for conversation data
 */
export function useEncryptedConversation() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  // Check encryption status on mount and when user changes
  useEffect(() => {
    if (user) {
      setIsEnabled(isEncryptionEnabled());
    } else {
      setIsEnabled(false);
    }
  }, [user]);

  /**
   * Encrypts a message for sending to the server
   * @param content The content to encrypt
   * @returns The encrypted content or null if encryption is not enabled
   */
  const encryptMessage = async (content: any): Promise<EncryptedData | null> => {
    if (!isEnabled) return null;

    const activeKey = getActiveEncryptionKey();
    if (!activeKey || !activeKey.publicKey) return null;

    try {
      // Convert to string if it's an object
      const contentStr = typeof content === "object" 
        ? JSON.stringify(content) 
        : String(content);
      
      // Encrypt with active key
      return await encryptData(contentStr, activeKey.publicKey, activeKey.id);
    } catch (error) {
      console.error("Failed to encrypt message:", error);
      return null;
    }
  };

  /**
   * Decrypts a message received from the server using passkeys
   * @param encryptedData The encrypted data to decrypt
   * @returns The decrypted content or null if decryption fails
   */
  const decryptMessage = async (encryptedData: EncryptedData): Promise<any | null> => {
    if (!isEnabled) return null;

    try {
      // Use passkey-based decryption
      const decrypted = await decryptWithPasskey(encryptedData);
      
      // Try to parse as JSON if possible
      try {
        return JSON.parse(decrypted);
      } catch {
        // If it's not valid JSON, return as is
        return decrypted;
      }
    } catch (error) {
      console.error("Failed to decrypt message:", error);
      return null;
    }
  };

  /**
   * Prepares request object with optional encryption
   * @param requestData The request data to prepare
   * @returns The prepared request data and headers
   */
  const prepareRequest = async (requestData: any) => {
    let headers = {};
    let data = { ...requestData };

    if (isEnabled) {
      const encrypted = await encryptMessage(requestData);
      if (encrypted) {
        // If encryption succeeded, add it to the request and set headers
        data = { 
          ...data,
          encryptedContent: encrypted 
        };
        headers = getEncryptionHeaders();
      }
    }

    return { data, headers };
  };

  return {
    isEncryptionEnabled: isEnabled,
    encryptMessage,
    decryptMessage,
    prepareRequest
  };
}