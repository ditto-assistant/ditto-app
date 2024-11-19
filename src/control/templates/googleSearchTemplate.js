/**
 * @returns {string}
 */
export function googleSearchSystemTemplate() {
  return `You are an experienced Google Searcher named Ditto here to help the user, who is your best friend.
`;
}

/**
 * @param {string} searchQuery
 * @param {string} contents
 * @returns {string}
 */
export function websiteToRelevantContentsTemplate(searchQuery, contents) {
  return `You will be given the full conents of a website followed by a user's Search Query and you will need to find the most relevant information to the user's search query.

## Instructions
- Below will contain the full contents of a website. You will need to find the most relevant information to the user's search query.
- Respond in markdown title + list format and supply links in markdown format if any are relevant to the user's search query.

Search Query: ${searchQuery}
Website Contents:
${contents}

Summary: 
`;
}

/**
 * @param {string} query
 * @param {string} searchResults
 * @param {string} websiteSummary
 * @returns {string}
 */
export function googleSearchResultsAndWebsiteSummary(
  query,
  searchResults,
  websiteSummary
) {
  return `You will be given a user's Search Query, the top 5 search results and the summary of a website. You will need to create a summary of the contents provided, answering the user's search query with the most relevant information.

## Instructions
- Take the Search Query, top 5 search results, and a website's summary to craft a response that answers the user's search query with the most relevant information.
- Use markdown formatting where necessary to provide the most relevant information to the user's search query.

Search Query: ${query}
Search Results:
${searchResults}
Website Summary:
${websiteSummary}

Response:
`;
}

/**
 * @param {string} query
 * @param {string} searchResults
 * @returns {string}
 */
export function googleSearchTemplate(query, searchResults) {
  return `You are an experienced Google Searcher ready to create a response to the uer's search query.

## Instructions
- Below will contain the user's search query and the top 5 search results. You will need to create an appropriate response to the user's search query based on the search results.
- Be sure to provide markdown formatted links in your response for the user to find more information if needed.
- In general, use markdown headers and lists to format your response unless its short enough to be a single sentence or two.
- If none of the websites are relevant, respond informing the user that the information does not seem to be in the search results.


User's Prompt: ${query}
Search Results:
${searchResults}

Response: 
`;
}
