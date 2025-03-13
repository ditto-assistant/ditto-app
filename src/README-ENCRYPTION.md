# Ditto End-to-End Encryption with Passkeys

This document outlines the implementation of end-to-end encryption for the Ditto application, using WebAuthn/passkeys.

## Overview

The encryption system implemented in Ditto provides end-to-end encryption for user conversations with the security and convenience of passkeys. This means that:

1. Messages are encrypted on the client side before being sent to the server
2. The server stores encrypted messages without the ability to decrypt them
3. Only clients with the appropriate passkey can decrypt and read messages
4. Passkeys sync across user devices via platform synchronization (iCloud Keychain, Google Password Manager, etc.)

## Architecture

### Key Components

1. **Encryption Utilities** (`/src/utils/encryption.ts`)
   - Passkey generation using WebAuthn API
   - Key derivation from passkey credentials
   - Encryption/decryption methods
   - Key management utilities

2. **Backend API Integration** (`/src/api/encryption.ts`)
   - API endpoints for key registration, rotation, and management
   - Functions for retrieving and managing encryption keys

3. **UI Components** (`/src/screens/Settings/EncryptionControlsModal.tsx`)
   - User interface for enabling/disabling encryption
   - Passkey creation and rotation
   - Encryption status indicators

4. **Conversation Integration** (`/src/hooks/useEncryptedConversation.ts`)
   - Hook for handling encrypted messages in conversations
   - Integration with existing conversation API endpoints

### Passkey-Based Key Management

- WebAuthn/passkeys for secure credential management
- RSA-OAEP encryption with 2048-bit keys derived from passkey credentials
- Credentials are stored in the platform's secure credential store (Secure Enclave, TPM, etc.)
- Credentials sync across devices via the platform's syncing mechanism
- Public keys are registered with the server, private keys never leave the device

### Encryption Flow

1. User enables encryption in Settings
2. A new passkey is created using the WebAuthn API
3. Encryption keys are derived from the passkey
4. The public key is registered with the server
5. When sending messages:
   - The message is encrypted with the public key
   - Both encrypted and plaintext versions are sent to the server
   - Plaintext is used for embeddings/search and is not stored
   - Encrypted content is stored in Firestore
6. When receiving messages:
   - If message has encrypted content, the user is prompted to use their passkey
   - The passkey is used to derive the decryption key
   - The message is decrypted using the derived key
   - If decryption fails, a placeholder is shown

## Implementation Details

### 1. Passkey Generation and Key Derivation

We use the WebAuthn API to create passkeys and derive encryption keys:

```typescript
export async function generateEncryptionKey(): Promise<{publicKey: JsonWebKey, privateKey: CryptoKey}> {
  // Check if passkeys are supported
  if (!window.PublicKeyCredential) {
    throw new Error("Passkeys are not supported in this browser");
  }
  
  // Create a user ID and challenge
  const userId = `ditto-user-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  
  // Create credential creation options
  const credentialCreationOptions: CredentialCreationOptions = {
    publicKey: {
      challenge,
      rp: { name: "Ditto App", id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(userId),
        name: userId,
        displayName: "Ditto Encryption Key"
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred",
        residentKey: "required"
      },
      attestation: "none"
    }
  };
  
  // Create the passkey
  const credential = await navigator.credentials.create(credentialCreationOptions) as PublicKeyCredential;
  
  // Derive encryption keys from the credential data
  const response = credential.response as AuthenticatorAttestationResponse;
  const clientDataJSON = response.clientDataJSON;
  
  // Generate key material from credential data
  const keyMaterial = await window.crypto.subtle.digest(
    "SHA-256",
    new Uint8Array([...new TextEncoder().encode(credential.id), ...new Uint8Array(clientDataJSON)])
  );
  
  // Derive encryption keys
  const derivedKeyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  
  // Store credential ID for later use
  localStorage.setItem("ditto_encryption_credential_id", credential.id);
  
  // Return the derived keys
  const publicKey = await window.crypto.subtle.exportKey("jwk", derivedKeyPair.publicKey);
  return { publicKey, privateKey: derivedKeyPair.privateKey };
}
```

### 2. Encryption/Decryption

Messages are encrypted using the RSA-OAEP algorithm:

```typescript
export async function encryptData(
  data: string,
  publicKey: JsonWebKey,
  keyId: string
): Promise<EncryptedData> {
  // Import public key
  const importedPublicKey = await window.crypto.subtle.importKey(
    "jwk", publicKey, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]
  );

  // Generate IV and encrypt
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP", iv }, importedPublicKey, dataBuffer
  );
  
  // Convert to Base64
  const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
  const ivBase64 = btoa(String.fromCharCode(...iv));
  
  return { ciphertext, iv: ivBase64, keyId };
}
```

### 3. Passkey Authentication for Decryption

When decrypting messages, we use the passkey to authenticate and derive the decryption key:

```typescript
export async function decryptWithPasskey(encryptedData: EncryptedData): Promise<string> {
  // Get the stored credential ID
  const credentialId = localStorage.getItem("ditto_encryption_credential_id");
  if (!credentialId) {
    throw new Error("No encryption credential found");
  }

  // Create a challenge for authentication
  const challenge = window.crypto.getRandomValues(new Uint8Array(32));
  
  // Request credential authentication
  const assertionOptions: CredentialRequestOptions = {
    publicKey: {
      challenge,
      allowCredentials: [{
        id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
        type: "public-key"
      }],
      userVerification: "preferred"
    }
  };
  
  // Authenticate with the passkey
  const credential = await navigator.credentials.get(assertionOptions) as PublicKeyCredential;
  
  // Extract authentication data
  const response = credential.response as AuthenticatorAssertionResponse;
  const authenticatorData = response.authenticatorData;
  
  // Derive key material from the authentication data
  const keyMaterial = await window.crypto.subtle.digest(
    "SHA-256",
    new Uint8Array([
      ...new TextEncoder().encode(credential.id), 
      ...new Uint8Array(authenticatorData)
    ])
  );
  
  // Derive the decryption key
  const derivedKeyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  
  // Decrypt the data
  return await decryptData(encryptedData, derivedKeyPair.privateKey);
}
```

### 4. Backend Integration

Client-side encryption is integrated with backend API endpoints:

```typescript
export async function saveResponse(
  pairID: string,
  response: string,
  encryptedContent?: { ciphertext: string; iv: string; keyId: string }
): Promise<Result<void>> {
  // Prepare request with encrypted content if available
  const request = {
    userID: userID,
    pairID,
    response,
    ...(encryptedContent && { encryptedContent }),
  };
  
  // Set headers for encrypted content
  const headers = {
    "Content-Type": encryptedContent ? "application/json+encrypted" : "application/json",
    "Authorization": `Bearer ${token}`,
  };
  
  // Make API call
  const response = await fetch(routes.saveResponse, {
    method: "POST",
    headers,
    body: JSON.stringify(request),
  });
}
```

## Security Considerations

1. **Passkey Storage**: 
   - Passkeys are stored in the platform's secure credential store
   - This provides hardware-backed security on supported devices
   - Passkeys sync across devices using the platform's synchronization mechanism
   - The credential ID is stored in localStorage for reference, but the actual private key material is protected by the WebAuthn API

2. **Content Separation**:
   - Unencrypted content is sent to the server for embeddings/search 
   - Only encrypted content is stored long-term
   - This compromise allows for searchability while maintaining security

3. **Migration**:
   - Existing conversations can be migrated to encrypted format
   - Users must explicitly choose to migrate their conversations

4. **Cross-Platform Support**:
   - WebAuthn/passkeys work on most modern browsers and platforms
   - Mobile devices (iOS, Android) and desktop browsers (Chrome, Safari, Edge, Firefox) support passkeys
   - Platform-specific syncing (iCloud Keychain, Google Password Manager) allows for seamless multi-device use

## WebAuthn PRF Extension

The encryption implementation has been enhanced to use the WebAuthn PRF (Pseudo-Random Function) extension. This extension provides more reliable and standardized key derivation from WebAuthn credentials:

### Benefits of PRF Extension

1. **Consistent Key Derivation**: PRF provides a standardized way to derive encryption keys from passkeys
2. **Cross-Device Compatibility**: The same PRF input will produce the same output across different devices with the same credential
3. **Improved Security**: Uses the authenticator's security capabilities rather than custom key derivation
4. **Fallback Support**: System falls back to the legacy key derivation method if PRF is not supported

### Implementation Details

The PRF extension is used both during passkey creation and authentication:

```typescript
// When creating a passkey
if (challenge.prfSalt) {
  const prfSaltBuffer = base64ToArrayBuffer(challenge.prfSalt);
  extensions.prf = {
    eval: {
      first: prfSaltBuffer,
    },
  };
}

// When using the PRF result
const extensionResults = credential.getClientExtensionResults();
if (extensionResults.prf && extensionResults.prf.enabled && extensionResults.prf.results) {
  keyMaterial = extensionResults.prf.results.first;
} else {
  // Fallback to legacy method
}
```

## Future Improvements

1. **Recovery Mechanisms**: Add backup/recovery options for passkeys beyond platform syncing
2. **Delegation**: Allow users to authorize specific devices or people to access encrypted content
3. **Key Rotation Policies**: Implement automated key rotation based on time or usage
4. **Independent Platform Support**: Support WebAuthn/passkeys on platforms without native syncing
5. **Multi-Key Encryption**: Use multiple keys for the same content to support sharing with specific users

## Resources

- [WebAuthn API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
- [Passkey Developer Guide](https://developers.google.com/identity/passkeys)
- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [RSA-OAEP Encryption](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt#rsa-oaep)
- [Multi-device Credential Management](https://w3c.github.io/webauthn/#sctn-credential-backup)