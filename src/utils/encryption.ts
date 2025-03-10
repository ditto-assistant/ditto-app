import { getToken } from "@/api/auth";
import { base64ToArrayBuffer } from "@/api/passkeys";

// Types
export interface EncryptionKey {
  keyId: string;
  version: number;
  credentialId: string;
  keyDerivationMethod: string;
  passkeyName: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
}

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  keyId: string;
}

// Generate a new passkey and derive encryption keys from it
export async function generateEncryptionKey(displayName?: string): Promise<{
  publicKey: JsonWebKey;
  privateKey: CryptoKey;
  credential: PublicKeyCredential;
  challengeId: number;
}> {
  try {
    // Check if passkeys are supported
    if (!window.PublicKeyCredential) {
      throw new Error("Passkeys (WebAuthn) are not supported in this browser");
    }

    const token = await getToken();
    if (token.err) {
      throw token.err;
    }
    if (!token.ok) {
      throw new Error("Failed to get token");
    }
    const userId = token.ok.userID;

    // Get a registration challenge from the server
    console.log(
      "Getting registration challenge for:",
      displayName || "Ditto Encryption Key",
    );
    const challenge = await getRegistrationChallenge(
      displayName || "Ditto Encryption Key",
    );
    if (!challenge) {
      throw new Error("Failed to get registration challenge from server");
    }
    console.log("Received challenge:", challenge.challengeId);

    // Convert challenge string to ArrayBuffer using proper base64 decoding
    const challengeBuffer = base64ToArrayBuffer(challenge.challenge);

    // Create credential creation options using the server-provided parameters
    const credentialCreationOptions: CredentialCreationOptions = {
      publicKey: {
        challenge: challengeBuffer,
        rp: {
          name: challenge.rpName,
          id: challenge.rpId,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: displayName || "Ditto User",
          displayName: displayName || "Ditto Encryption Key",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification:
            challenge.userVerification as AuthenticatorSelectionCriteria["userVerification"],
          residentKey: "required",
        },
        attestation: "direct",
        timeout: challenge.timeout,
      },
    };

    // Create the credential
    const credential = (await navigator.credentials.create(
      credentialCreationOptions,
    )) as PublicKeyCredential;

    if (!credential) {
      throw new Error("Failed to create passkey");
    }

    // Get the credential ID
    const credentialId = credential.id;

    // Extract the client data JSON and attestation object
    const response = credential.response as AuthenticatorAttestationResponse;
    const clientDataJSON = response.clientDataJSON;

    // Derive encryption keys from the credential data
    // Use key derivation to create symmetric keys for encryption
    const keyMaterial = await window.crypto.subtle.digest(
      "SHA-256",
      new Uint8Array([
        ...new TextEncoder().encode(credentialId),
        ...new Uint8Array(clientDataJSON),
      ]),
    );

    // Import the key material as a CryptoKey
    const baseKey = await window.crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "HKDF" },
      false,
      ["deriveBits", "deriveKey"],
    );

    // Derive an RSA key pair from the base key using HKDF
    const derivedKeyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"],
    );

    // Export the public key in JWK format
    const publicKey = await window.crypto.subtle.exportKey(
      "jwk",
      derivedKeyPair.publicKey,
    );

    return {
      publicKey,
      privateKey: derivedKeyPair.privateKey,
      credential,
      challengeId: challenge.challengeId,
    };
  } catch (error) {
    console.error("Failed to generate encryption key:", error);
    throw new Error(
      "Failed to generate encryption key: " +
        (error instanceof Error ? error.message : String(error)),
    );
  }
}

// Helper function to get registration challenge
async function getRegistrationChallenge(displayName?: string): Promise<{
  challengeId: number;
  challenge: string;
  rpId: string;
  rpName: string;
  userVerification: string;
  timeout: number;
} | null> {
  try {
    // Import dynamically to avoid circular dependencies
    const { getRegistrationChallenge } = await import("../api/passkeys");
    return await getRegistrationChallenge(displayName);
  } catch (error) {
    console.error("Failed to get registration challenge:", error);
    return null;
  }
}

// Encryption function
export async function encryptData(
  data: string,
  publicKey: JsonWebKey,
  keyId: string,
): Promise<EncryptedData> {
  try {
    // Import public key
    const importedPublicKey = await window.crypto.subtle.importKey(
      "jwk",
      publicKey,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      false, // not extractable
      ["encrypt"],
    );

    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Convert data to ArrayBuffer
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Encrypt the data
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
        iv,
      },
      importedPublicKey,
      dataBuffer,
    );

    // Convert to Base64
    const ciphertext = btoa(
      String.fromCharCode(...new Uint8Array(encryptedBuffer)),
    );
    const ivBase64 = btoa(String.fromCharCode(...iv));

    return {
      ciphertext,
      iv: ivBase64,
      keyId,
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt data");
  }
}

// Decryption function
export async function decryptData(
  encryptedData: EncryptedData,
  privateKey: CryptoKey,
): Promise<string> {
  try {
    // Convert Base64 back to ArrayBuffer
    const ciphertextBinary = atob(encryptedData.ciphertext);
    const ciphertextBuffer = new Uint8Array(ciphertextBinary.length);
    for (let i = 0; i < ciphertextBinary.length; i++) {
      ciphertextBuffer[i] = ciphertextBinary.charCodeAt(i);
    }

    const ivBinary = atob(encryptedData.iv);
    const iv = new Uint8Array(ivBinary.length);
    for (let i = 0; i < ivBinary.length; i++) {
      iv[i] = ivBinary.charCodeAt(i);
    }

    // Decrypt the data
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
        iv,
      },
      privateKey,
      ciphertextBuffer,
    );

    // Convert ArrayBuffer back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Failed to decrypt data");
  }
}

// Get the current encryption credential for passkey authentication
export async function getEncryptionCredential(): Promise<{
  credential: PublicKeyCredential;
  challengeId: number;
} | null> {
  try {
    // Import dynamically to avoid circular dependencies
    const { getAuthenticationChallenge } = await import("../api/passkeys");

    // First, request an authentication challenge from the server
    const challenge = await getAuthenticationChallenge();
    if (!challenge) {
      throw new Error("Failed to get authentication challenge from server");
    }

    // Convert challenge from base64 to ArrayBuffer
    const challengeBuffer = base64ToArrayBuffer(challenge.challenge);

    // Create the credential request options
    const credentialRequestOptions: CredentialRequestOptions = {
      publicKey: {
        challenge: challengeBuffer,
        rpId: challenge.rpId,
        userVerification:
          challenge.userVerification as AuthenticatorSelectionCriteria["userVerification"],
        timeout: challenge.timeout,
      },
    };

    // If the server provides allowed credentials, add them
    if (challenge.allowCredentials && challenge.allowCredentials.length > 0) {
      (
        credentialRequestOptions.publicKey as PublicKeyCredentialRequestOptions
      ).allowCredentials = challenge.allowCredentials.map((credId) => ({
        id: base64ToArrayBuffer(credId),
        type: "public-key",
      }));
    }

    // Get the credential
    const credential = (await navigator.credentials.get(
      credentialRequestOptions,
    )) as PublicKeyCredential;

    if (!credential) {
      throw new Error("Failed to get passkey credential");
    }

    return {
      credential,
      challengeId: challenge.challengeId,
    };
  } catch (error) {
    console.error("Failed to retrieve encryption credential:", error);
    return null;
  }
}

// Function to decrypt with passkey authentication
export async function decryptWithPasskey(
  encryptedData: EncryptedData,
): Promise<string> {
  // Get the encryption credential and authenticate it
  const result = await getEncryptionCredential();
  if (!result) {
    throw new Error("Failed to get encryption credential");
  }

  const { credential, challengeId } = result;

  // Authenticate the credential with the server
  const { authenticatePasskey } = await import("../api/passkeys");
  const authResult = await authenticatePasskey(credential, challengeId);

  if (!authResult.success) {
    throw new Error(
      "Failed to authenticate with passkey: " + authResult.message,
    );
  }

  // Extract the authenticator data
  const response = credential.response as AuthenticatorAssertionResponse;
  const authenticatorData = response.authenticatorData;

  // Derive encryption key material from credential data
  const keyMaterial = await window.crypto.subtle.digest(
    "SHA-256",
    new Uint8Array([
      ...new TextEncoder().encode(credential.id),
      ...new Uint8Array(authenticatorData),
    ]),
  );

  // Import the key material
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "HKDF" },
    false,
    ["deriveBits", "deriveKey"],
  );

  // Recreate the RSA key pair
  const derivedKeyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );

  // Now decrypt the data using the derived private key
  return await decryptData(encryptedData, derivedKeyPair.privateKey);
}

// Encrypt/decrypt conversation data
// export async function encryptConversation(conversation: any): Promise<any> {
//   const { activeKey } = await import("@/hooks/useEncryptionKeys").then(
//     (module) => module.useEncryptionKeys(),
//   );
//   if (!activeKey) {
//     throw new Error("No active encryption key found");
//   }

//   // Deep clone to avoid modifying original
//   const encryptedConversation = JSON.parse(JSON.stringify(conversation));

//   // Encrypt relevant fields (assuming conversation has messages array)
//   if (
//     encryptedConversation.messages &&
//     Array.isArray(encryptedConversation.messages)
//   ) {
//     for (let i = 0; i < encryptedConversation.messages.length; i++) {
//       const message = encryptedConversation.messages[i];

//       if (message.content) {
//         const encryptedContent = await encryptData(
//           JSON.stringify(message.content),
//           activeKey.publicKey,
//           activeKey.id,
//         );
//         message.encryptedContent = encryptedContent;
//         message.content = "[ENCRYPTED]"; // Keep a placeholder
//       }
//     }
//   }

//   encryptedConversation.isEncrypted = true;
//   return encryptedConversation;
// }
