import { getToken } from "./auth";
import { routes } from "../firebaseConfig";

/**
 * Presigns a URL for a given user.
 * 
 * @param {string} url - The URL to presign.
 * @returns {Promise<string>} A promise that resolves to the presigned URL.
 */
export async function presignURL(url) {
    const tok = await getToken();
    if (tok.err) {
        return tok.err;
    }
    const response = await fetch(routes.presignURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tok.ok.token}`
        },
        body: JSON.stringify({
            url,
        }),
    });
    return await response.text();
}
