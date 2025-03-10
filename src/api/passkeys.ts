import { getToken } from "./auth";
import { routes } from "../firebaseConfig";

// Response types
export interface WebAuthnChallenge {
  challengeId: number;
  challenge: string;
  rpId: string;
  rpName: string;
  userVerification: string;
  timeout: number;
  allowCredentials?: string[];
}

export interface WebAuthnRegistrationResponse {
  success: boolean;
  credentialId: string;
  message?: string;
}

export interface WebAuthnAuthenticationResponse {
  success: boolean;
  message?: string;
}

// Request to generate a registration challenge
export async function getRegistrationChallenge(
  userDisplayName?: string,
): Promise<WebAuthnChallenge | null> {
  try {
    const tokenResult = await getToken();
    if (tokenResult.err || !tokenResult.ok) {
      console.error("Authentication failed");
      return null;
    }

    const { token } = tokenResult.ok;

    const response = await fetch(routes.passkeys.registrationChallenge, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userDisplayName,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${errorText || response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get registration challenge:", error);
    return null;
  }
}

// Function to actually register a passkey using the challenge
export async function registerPasskey(
  credentialResponse: PublicKeyCredential,
  challengeId: number,
  passkeyName: string,
): Promise<WebAuthnRegistrationResponse> {
  try {
    console.log("Starting registerPasskey with challengeId:", challengeId);
    console.log("Credential ID:", credentialResponse.id);

    const tokenResult = await getToken();
    if (tokenResult.err || !tokenResult.ok) {
      return {
        success: false,
        credentialId: "",
        message: "Authentication failed",
      };
    }

    const { token } = tokenResult.ok;

    const response = await fetch(
      routes.passkeys.register(challengeId, passkeyName),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(credentialResponse.toJSON()),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${errorText || response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to register passkey:", error);
    return {
      success: false,
      credentialId: "",
      message:
        error instanceof Error ? error.message : "Failed to register passkey",
    };
  }
}

// Request to generate an authentication challenge
export async function getAuthenticationChallenge(): Promise<WebAuthnChallenge | null> {
  try {
    const tokenResult = await getToken();
    if (tokenResult.err || !tokenResult.ok) {
      console.error("Authentication failed");
      return null;
    }

    const { token } = tokenResult.ok;

    const response = await fetch(routes.passkeys.authenticationChallenge, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}), // Empty body for now
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${errorText || response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get authentication challenge:", error);
    return null;
  }
}

// Function to authenticate with a passkey
export async function authenticatePasskey(
  credentialResponse: PublicKeyCredential,
  challengeId: number,
): Promise<WebAuthnAuthenticationResponse> {
  try {
    const tokenResult = await getToken();
    if (tokenResult.err || !tokenResult.ok) {
      return {
        success: false,
        message: "Authentication failed",
      };
    }
    const { token } = tokenResult.ok;
    const response = await fetch(routes.passkeys.authenticate(challengeId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(credentialResponse.toJSON()),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${errorText || response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to authenticate with passkey:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to authenticate with passkey",
    };
  }
}

// Helper function to convert ArrayBuffer to URL-safe base64 string
// function arrayBufferToBase64(buffer: ArrayBuffer): string {
//   const bytes = new Uint8Array(buffer);
//   let binary = "";
//   for (let i = 0; i < bytes.byteLength; i++) {
//     binary += String.fromCharCode(bytes[i]);
//   }
//   // Convert to standard base64 first
//   let base64 = btoa(binary);
//   // Then convert to URL-safe base64 by replacing characters and removing padding
//   return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
// }

// Helper function to convert URL-safe base64 string to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Convert URL-safe base64 to standard base64
  const standardBase64 = base64.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = standardBase64.padEnd(
    standardBase64.length + ((4 - (standardBase64.length % 4)) % 4),
    "=",
  );

  const binaryString = atob(padded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Interface for passkey/encryption key list items
export interface PasskeyListItem {
  keyId: string;
  credentialId: string;
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
  version: number;
  keyDerivationMethod: string;
  passkeyName?: string;
}

export interface ListPasskeysResponse {
  keys: PasskeyListItem[];
}

// List all passkeys for the current user
export async function listPasskeys(): Promise<ListPasskeysResponse> {
  try {
    const tokenResult = await getToken();
    if (tokenResult.err || !tokenResult.ok) {
      return {
        keys: [],
      };
    }

    const { token } = tokenResult.ok;

    const response = await fetch(routes.passkeys.list, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${errorText || response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to list passkeys:", error);
    return {
      keys: [],
    };
  }
}
