export const urlReaderSystemTemplate = () => {
  return "You are an experienced URL Reader ready to read and summarize information from a website. You will be given a website URL and you will need to read the information and summarize / respond to the user.";
};

export const urlReaderTemplate = (
  usersPrompt: string,
  websiteContents: string,
) => {
  return `You will be given a user's prompt and a website's contents. You will need to read the information from the website and summarize it for the user.

## Instructions
- Below will contain the user's prompt and the URL. You will need to read the information from the URL and summarize / respond to the user.
- If the user's prompt is just a URL, default to summarizing the contents of the website using markdown formatting. Otherwise, simply respond to the user given the website's contents and the user's prompt in a natural and informative way. Only use markdown if the response is getting a bit long.

Website Contents:
<!contents>

User's Prompt: <!prompt>
Response:
`
    .replace("<!contents>", websiteContents)
    .replace("<!prompt>", usersPrompt);
};
