import { getToken } from "@/api/auth";
import { base64ToArrayBuffer, getRegistrationChallenge } from "@/api/passkeys";

// Types
export interface EncryptionKey {
  keyId: string;
  publicKey: string;
  version: number;
  credentialId: string;
  keyDerivationMethod: string;
  passkeyName: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string;
  prfEnabled?: boolean;
  prfSalt?: string;
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

    // PRF extension support
    const extensions: AuthenticationExtensionsClientInputs = {};

    // Always request PRF extension, even if server doesn't provide a salt
    if (challenge.prfSalt) {
      // If the server provides a salt, use it
      const prfSaltBuffer = base64ToArrayBuffer(challenge.prfSalt);
      extensions.prf = {
        eval: {
          first: prfSaltBuffer,
        },
      };
    } else {
      // If no salt is provided, use a fixed value as in the docs example
      // This helps ensure consistent key derivation
      extensions.prf = {
        eval: {
          first: new TextEncoder().encode("Ditto encryption key"),
        },
      };
    }

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
        extensions,
      },
    };

    console.log("Creating credential with options:", {
      rpId: challenge.rpId,
      prf: extensions.prf,
      prfInputLength: extensions.prf?.eval?.first
        ? (extensions.prf.eval.first as ArrayBuffer).byteLength
        : 0,
    });

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

    // Check if the PRF extension was used
    const extensionResults = credential.getClientExtensionResults();
    let keyMaterial: ArrayBuffer;

    if (
      extensionResults.prf &&
      "enabled" in extensionResults.prf &&
      extensionResults.prf.enabled
    ) {
      console.log("Using PRF extension for key derivation");
      // If PRF was enabled, use the PRF output as key material
      if (
        "results" in extensionResults.prf &&
        extensionResults.prf.results &&
        extensionResults.prf.results.first
      ) {
        keyMaterial = extensionResults.prf.results.first;
      } else {
        // Fallback to legacy method if PRF didn't return results
        console.warn(
          "PRF extension enabled but no results returned, falling back to legacy method",
        );
        keyMaterial = await window.crypto.subtle.digest(
          "SHA-256",
          new Uint8Array([
            ...new TextEncoder().encode(credentialId),
            ...new Uint8Array(clientDataJSON),
          ]),
        );
      }
    } else {
      console.log(
        "PRF extension not supported or enabled, using legacy key derivation",
      );
      // Legacy method - derive from credential ID and client data
      keyMaterial = await window.crypto.subtle.digest(
        "SHA-256",
        new Uint8Array([
          ...new TextEncoder().encode(credentialId),
          ...new Uint8Array(clientDataJSON),
        ]),
      );
    }

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

    // Convert data to ArrayBuffer
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Encrypt the data - RSA-OAEP doesn't use an IV parameter
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      importedPublicKey,
      dataBuffer,
    );

    // Convert to Base64URL encoding for safe storage and transmission
    const ciphertext = bufferToBase64URLString(encryptedBuffer);

    // RSA-OAEP doesn't use IV, but we need to maintain interface compatibility 
    // so we'll use an empty string for the IV field
    return {
      ciphertext,
      iv: "", // RSA-OAEP doesn't use IV
      keyId,
    };
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Convert the given array buffer into a Base64URL-encoded string.
 *
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function bufferToBase64URLString(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';

  for (const charCode of bytes) {
    str += String.fromCharCode(charCode);
  }

  const base64String = btoa(str);

  return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Decryption function
export async function decryptData(
  encryptedData: EncryptedData,
  privateKey: CryptoKey,
): Promise<string> {
  try {
    // Convert Base64URL back to ArrayBuffer
    const ciphertextBuffer = base64URLStringToBuffer(encryptedData.ciphertext);

    // Decrypt the data - RSA-OAEP doesn't use an IV parameter
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
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

/**
 * Convert from a Base64URL-encoded string to an Array Buffer.
 *
 * @param {string} base64URLString
 * @returns {ArrayBuffer}
 */
function base64URLStringToBuffer(base64URLString) {
  // Convert from Base64URL to Base64
  const base64 = base64URLString.replace(/-/g, '+').replace(/_/g, '/');
  
  // Pad with '=' until it's a multiple of four
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLength, '=');

  // Convert to a binary string
  const binary = atob(padded);

  // Convert binary string to buffer
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return buffer;
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

    // PRF extension support
    const extensions: AuthenticationExtensionsClientInputs = {};

    // Always request PRF extension, even if server doesn't provide a salt
    if (challenge.prfSalt) {
      // If the server provides a salt, use it
      const prfSaltBuffer = base64ToArrayBuffer(challenge.prfSalt);
      extensions.prf = {
        eval: {
          first: prfSaltBuffer,
        },
      };
    } else {
      // If no salt is provided, use the same fixed value as in registration
      // This ensures consistent key derivation across sessions
      extensions.prf = {
        eval: {
          first: new TextEncoder().encode("Ditto encryption key"),
        },
      };
    }

    // Create the credential request options
    const credentialRequestOptions: CredentialRequestOptions = {
      publicKey: {
        challenge: challengeBuffer,
        rpId: challenge.rpId,
        userVerification:
          challenge.userVerification as AuthenticatorSelectionCriteria["userVerification"],
        timeout: challenge.timeout,
        extensions,
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

    console.log("Authenticating with credential options:", {
      rpId: challenge.rpId,
      hasPRF: !!extensions.prf,
      prfInputLength: extensions.prf?.eval?.first
        ? (extensions.prf.eval.first as ArrayBuffer).byteLength
        : 0,
    });

    // Get the credential
    const credential = (await navigator.credentials.get(
      credentialRequestOptions,
    )) as PublicKeyCredential;

    if (!credential) {
      throw new Error("Failed to get passkey credential");
    }

    // Log extension results
    const extensionResults = credential.getClientExtensionResults();
    console.log("Credential extension results:", {
      hasPRF: extensionResults.prf,
    });

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

  // Check if the PRF extension was used
  const extensionResults = credential.getClientExtensionResults();
  let keyMaterial: ArrayBuffer;

  if (
    extensionResults.prf &&
    "enabled" in extensionResults.prf &&
    extensionResults.prf.enabled
  ) {
    console.log("Using PRF extension for key derivation during decryption");
    // If PRF was enabled, use the PRF output as key material
    if (
      "results" in extensionResults.prf &&
      extensionResults.prf.results &&
      extensionResults.prf.results.first
    ) {
      keyMaterial = extensionResults.prf.results.first;
    } else {
      // Fallback to legacy method if PRF didn't return results
      console.warn(
        "PRF extension enabled but no results returned for decryption, falling back to legacy method",
      );
      keyMaterial = await window.crypto.subtle.digest(
        "SHA-256",
        new Uint8Array([
          ...new TextEncoder().encode(credential.id),
          ...new Uint8Array(authenticatorData),
        ]),
      );
    }
  } else {
    console.log(
      "PRF extension not supported or enabled, using legacy key derivation for decryption",
    );
    // Legacy method - derive from credential ID and authenticator data
    keyMaterial = await window.crypto.subtle.digest(
      "SHA-256",
      new Uint8Array([
        ...new TextEncoder().encode(credential.id),
        ...new Uint8Array(authenticatorData),
      ]),
    );
  }

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

// Encrypt conversation data for migration
export async function encryptConversation(
  conversation: {
    id: string;
    prompt: string;
    response: string;
  },
  publicKey: JsonWebKey,
  keyId: string,
): Promise<{
  docId: string;
  encryptedPrompt: string;
  encryptedResponse: string;
}> {
  if (!publicKey) {
    throw new Error("Public key is required for encryption");
  }

  // Encrypt the prompt and response
  const encryptedPrompt = await encryptData(
    conversation.prompt,
    publicKey,
    keyId,
  );

  const encryptedResponse = await encryptData(
    conversation.response,
    publicKey,
    keyId,
  );

  // Return the encrypted data in the format expected by the migration API
  return {
    docId: conversation.id,
    encryptedPrompt: JSON.stringify(encryptedPrompt),
    encryptedResponse: JSON.stringify(encryptedResponse),
  };
}
