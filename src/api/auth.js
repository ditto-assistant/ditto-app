import { auth } from "../control/firebase";

/**
 * Retrieves the authentication token for the current user.
 * 
 * @returns {Promise<{ok?: {token: string, userID: string, email: string | null}, err?: Error}>} A promise that resolves to an object:
 */
export async function getToken() {
    if (!auth.currentUser) {
        return { err: new Error("User not logged in") };
    }
    try {
        const token = await auth.currentUser.getIdToken();
        return { ok: { token: token, userID: auth.currentUser.uid, email: auth.currentUser.email } };
    } catch (error) {
        console.error("Error getting token:", error);
        return { err: error };
    }
};
