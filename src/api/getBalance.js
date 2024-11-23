import { getToken } from "./auth";
import { routes } from "../firebaseConfig";
import { Balance } from "../types/api";
import { Result } from "../types/common";

/**
 * Retrieves the user's balance from the server.
 *
 * @returns {Promise<Result<Balance>>}
 */
export async function getBalance() {
  const tok = await getToken();
  if (tok.err) {
    console.error(tok.err);
    return { err: `getBalance: Unable to get auth token: ${tok.err}` };
  }
  const response = await fetch(routes.balance(tok.ok.userID, tok.ok.email), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tok.ok.token}`,
    },
  });
  if (response.ok) {
    const data = await response.json();
    return { ok: data };
  } else {
    return { err: `getBalance: Unable to get balance: ${response.status}` };
  }
}
