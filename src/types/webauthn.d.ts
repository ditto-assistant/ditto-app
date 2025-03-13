// TypeScript definitions for WebAuthn PRF extension
// Based on https://w3c.github.io/webauthn/#sctn-prf-extension

declare interface AuthenticationExtensionsPRFInput {
  eval: {
    first: ArrayBuffer;
    second?: ArrayBuffer;
  };
}

declare interface AuthenticationExtensionsPRFOutput {
  enabled: boolean;
  results?: {
    first: ArrayBuffer;
    second?: ArrayBuffer;
  };
}

declare interface AuthenticationExtensionsClientInputs {
  prf?: AuthenticationExtensionsPRFInput;
  [key: string]: any;
}

declare interface AuthenticationExtensionsClientOutputs {
  prf?: AuthenticationExtensionsPRFOutput;
  [key: string]: any;
}

// Augment the PublicKeyCredential interface
interface PublicKeyCredential {
  getClientExtensionResults(): AuthenticationExtensionsClientOutputs;
}

// Augment credential creation options
interface PublicKeyCredentialCreationOptions {
  extensions?: AuthenticationExtensionsClientInputs;
}

// Augment credential request options
interface PublicKeyCredentialRequestOptions {
  extensions?: AuthenticationExtensionsClientInputs;
}