import { getToken } from "./auth";
import { routes } from "../firebaseConfig";
import type { EncryptionKey } from "@/utils/encryption";
import { Result } from "@/types/common";

export interface RegisterKeyResponse {
  success: boolean;
  keyId: string;
  message?: string;
}

export interface GetKeyResponse {
  success: boolean;
  key?: EncryptionKey;
  message?: string;
}

export interface RotateKeyResponse {
  success: boolean;
  keyId?: string;
  message?: string;
}

type ListKeysResponse = {
  keys?: EncryptionKey[];
};

export interface DeactivateKeyResponse {
  success: boolean;
  message?: string;
}

export interface MigrateConversationsResponse {
  success: boolean;
  migratedCount?: number;
  message?: string;
}

// List all encryption keys for the user
export async function listKeys(): Promise<Result<ListKeysResponse>> {
  try {
    const tokenResult = await getToken();
    if (tokenResult.err || !tokenResult.ok) {
      return {
        err: "Authentication failed",
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
      return {
        err: `Server error: ${errorText || response.status}`,
      };
    }

    const data: ListKeysResponse = await response.json();
    return { ok: data };
  } catch (error) {
    console.error("Failed to list encryption keys:", error);
    return {
      err:
        error instanceof Error
          ? error.message
          : "Failed to list encryption keys",
    };
  }
}

// Deactivate an encryption key
// export async function deactivateKey(
//   keyId: string,
// ): Promise<DeactivateKeyResponse> {
//   try {
//     const tokenResult = await getToken();
//     if (tokenResult.err) {
//       return {
//         success: false,
//         message: "Authentication failed",
//       };
//     }

//     const { token, userID } = tokenResult.ok;

//     const response = await fetch(routes.passkeys.deactivate, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify({
//         userID,
//         keyId,
//       }),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Server error: ${errorText || response.status}`);
//     }

//     const data: DeactivateKeyResponse = await response.json();
//     return data;
//   } catch (error) {
//     console.error("Failed to deactivate encryption key:", error);
//     return {
//       success: false,
//       message:
//         error instanceof Error
//           ? error.message
//           : "Failed to deactivate encryption key",
//     };
//   }
// }

// Migrate conversations to encrypted format
// export async function migrateConversations(): Promise<MigrateConversationsResponse> {
//   try {
//     const tokenResult = await getToken();
//     if (tokenResult.err) {
//       return {
//         success: false,
//         message: "Authentication failed",
//       };
//     }

//     const { token, userID } = tokenResult.ok;

//     const response = await fetch(routes.passkeys.migrate, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${token}`,
//       },
//       body: JSON.stringify({
//         userID,
//       }),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`Server error: ${errorText || response.status}`);
//     }

//     const data: MigrateConversationsResponse = await response.json();
//     return data;
//   } catch (error) {
//     console.error("Failed to migrate conversations:", error);
//     return {
//       success: false,
//       message:
//         error instanceof Error
//           ? error.message
//           : "Failed to migrate conversations",
//     };
//   }
// }

// Helper function to handle encryption headers
export function getEncryptionHeaders() {
  return {
    "Content-Type": "application/json+encrypted",
  };
}
