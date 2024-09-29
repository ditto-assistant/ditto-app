import { firebaseConfig } from "../../firebaseConfig";

// convert the above export into a function that I can use in my app to get the top k results from a google search
export const googleSearch = async (query: string, numResults: number = 5) => {
    try {
        const response = await fetch(firebaseConfig.googleSearchURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                numResults
            }),
        });
        const responseJSON = await response.json();
        return responseJSON.searchResults;
    } catch (error) {
        console.error(error);
        return "Error: Unable to retrieve search results.";
    }
}
