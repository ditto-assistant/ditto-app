import { getToken } from "./auth";
import { routes } from "../firebaseConfig";

/**
 * Retrieves the user's balance from the server.
 * 
 * @returns {Promise<{ok?: string, err?: string}>} A promise that resolves to an object:
 *   - If successful, returns {ok: balance} where balance is a formatted string.
 *   - If unsuccessful, returns {err: errorMessage} where errorMessage is a string describing the error.
 */
export async function getBalance() {
    const tok = await getToken();
    if (tok.err) {
        console.error(tok.err);
        return { err: `getBalance: Unable to get auth token: ${tok.err}`, }
    }
    const response = await fetch(routes.balance(tok.ok.userID), {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${tok.ok.token}`
        }
    });
    if (response.ok) {
        const data = await response.json();
        return { ok: data.balance };
    } else {
        return { err: `getBalance: Unable to get balance: ${response.status}` };
    }
}