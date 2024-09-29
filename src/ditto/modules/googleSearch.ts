import { auth } from "../../control/firebase";
import { firebaseConfig } from "../../firebaseConfig";

// convert the above export into a function that I can use in my app to get the top k results from a google search
export const googleSearch = async (query: string, numResults: number = 5) => {
    if (!auth.currentUser) {
        return "Error: User not logged in.";
    }
    let tok;
    let userID = auth.currentUser.uid;
    try {
        tok = await auth.currentUser.getIdToken();
    } catch (e) {
        console.error(e)
        return "Error: Unable to retrieve search results.";
    }
    try {
        const response = await fetch(firebaseConfig.googleSearchURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tok}`
            },
            body: JSON.stringify({
                query,
                numResults,
                userID
            }),
        });
        return await response.text();
    } catch (error) {
        console.error(error);
        return `Unable to retrieve search results. Error: ${error}`;
    }
}
