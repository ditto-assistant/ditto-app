import packageJson from "../../package.json";

const DEVICE_ID_KEY = "ditto_device_id";

// Simple device ID generator using timestamp and random number
function generateDeviceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);

  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

// Get app version from package.json
export const APP_VERSION = packageJson.version;
