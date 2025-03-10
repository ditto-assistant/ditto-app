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
