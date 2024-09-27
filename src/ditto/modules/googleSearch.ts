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

// openaiImageGeneration function
// export const openaiImageGeneration = async (prompt, model = 'dall-e-3') => {
//     let usersOpenaiKey = localStorage.getItem('openai_api_key') || "";
//     let userID = localStorage.getItem('userID') || "";
//     let balanceKey = `${userID}_balance`;
//     let balance = localStorage.getItem(balanceKey) || 0;
  
//     const response = await fetch(firebaseConfig.openaiImageGenerationURL, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         prompt,
//         model,
//         usersOpenaiKey,
//         balance
//       }),
//     });
  
//     const data = await response.json();
//     return data.response;
//   }