import { getAuth } from "firebase/auth";

/**
 * Retrieves the authentication token for the current user.
 * 
 * @returns {Promise<{ok?: {token: string, userID: string}, err?: Error}>} A promise that resolves to an object:
 *   - If successful, returns {ok: {token: token, userID: userID}} where token is a string.
 *   - If unsuccessful, returns {err: error} where error is an Error object.
 */
export async function getToken() {
    const auth = getAuth();
    if (!auth.currentUser) {
        return { err: new Error("User not logged in") };
    }
    try {
        const token = await auth.currentUser.getIdToken();
        return { ok: { token: token, userID: auth.currentUser.uid } };
    } catch (error) {
        console.error("Error getting token:", error);
        return { err: error };
    }
};
