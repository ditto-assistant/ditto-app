import { getToken } from "@/api/auth";
import { routes } from "@/firebaseConfig";
import { Balance } from "@/types/api";
import { Result } from "@/types/common";
import { getDeviceID, APP_VERSION } from "@/utils/deviceId";

/**
 * Retrieves the user's balance from the server.
 */
export async function getBalance(): Promise<Result<Balance>> {
  const tok = await getToken();
  if (tok.err) {
    console.error(tok.err);
    return { err: `getBalance: Unable to get auth token: ${tok.err}` };
  }
  if (!tok.ok) {
    return { err: "getBalance: No token" };
  }

  const deviceID = getDeviceID();
  const response = await fetch(
    routes.balance(tok.ok.userID, tok.ok.email, APP_VERSION, deviceID),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tok.ok?.token}`,
        Accept: "application/json",
      },
    }
  );

  if (response.ok) {
    const data = await response.json();
    return { ok: data };
  } else {
    return { err: `getBalance: Unable to get balance: ${response.status}` };
  }
}
