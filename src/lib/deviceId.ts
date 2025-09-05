import packageJson from "../../package.json"

const DEVICE_ID_KEY = "ditto_device_id"

// Simple device ID generator using timestamp and random number
function generateDeviceID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

export function clearStorage(): void {
  const deviceID = getDeviceID()
  localStorage.clear()
  localStorage.setItem(DEVICE_ID_KEY, deviceID)
}

export function getDeviceID(): string {
  let deviceID = localStorage.getItem(DEVICE_ID_KEY)

  if (!deviceID) {
    deviceID = generateDeviceID()
    localStorage.setItem(DEVICE_ID_KEY, deviceID)
  }

  return deviceID
}

// Get app version from package.json
export const APP_VERSION = packageJson.version
