import { getToken } from "./auth";
import { routes } from "../firebaseConfig";

/**
 * Retrieves the user's balance and usage information from the server.
 *
 * @returns {Promise<{
 * ok?: {
 *  balance: string,
 *  usd: string,
 *  images: string,
 *  searches: string
 * },
 * err?: string
 * }>} A promise that resolves to an object:
 *   - If successful, returns {ok: {balance, usd, images, searches}} where:
 *     - balance is a formatted string representing the balance in tokens
 *     - usd is a formatted string representing the balance in USD
 *     - images is a string representing the balance in number of images generated
 *     - searches is a string representing the balance in number of searches performed
 *   - If unsuccessful, returns {err: errorMessage} where errorMessage is a string describing the error.
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
