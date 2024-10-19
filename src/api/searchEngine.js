import { auth } from "../control/firebase";
import { routes } from "../firebaseConfig";
import { getToken } from "./auth";

/**
 * Performs a Google search with the given query.
 * 
 * @param {string} query - The search query.
 * @param {number} [numResults=5] - The number of results to return.
 * @returns {Promise<string>} A promise that resolves to the search results as a string.
 */
export async function googleSearch(query, numResults = 5) {
    const tok = await getToken();
    if (tok.err) {
        console.error(tok.err);
        return "Error: Unable to retrieve search results";
    }
    try {
        const response = await fetch(routes.search, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tok.ok.token}`
            },
            body: JSON.stringify({
                query,
                numResults,
                userID: tok.ok.userID
            }),
        });
        return await response.text();
    } catch (error) {
        console.error(error);
        return `Unable to retrieve search results. Error: ${error}`;
    }
}
