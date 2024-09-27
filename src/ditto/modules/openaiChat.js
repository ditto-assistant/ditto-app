import { firebaseConfig } from "../../firebaseConfig";

// openaiChat function
export const openaiChat = async (userPrompt, systemPrompt, model = 'gpt-4o-2024-08-06', imageURL = "") => {
  let responseMessage = "";
  try {
    let usersOpenaiKey = localStorage.getItem('openai_api_key') || "";
    let userID = localStorage.getItem('userID') || "";
    let balanceKey = `${userID}_balance`;
    let balance = localStorage.getItem(balanceKey) || 0;

    if (usersOpenaiKey === "" && (Number(balance) <= 0 || balance === "NaN")) {
      return "You have no API key or your balance is too low to use. Please add more tokens in the settings page.";
    }

    const response = await fetch(firebaseConfig.openAIChatURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userPrompt,
        systemPrompt,
        model,
        imageURL,
        usersOpenaiKey,
        balance
      }),
    });

    const data = await response.json();
    responseMessage = data.response;
  } catch (error) {
    console.error(error);
    alert("Response Error: please check your internet connection or OpenAI API Key / permissions.");
    responseMessage = "Response Error: please check your internet connection or OpenAI API Key / permissions.";
  }
  return responseMessage;
}

// openaiImageGeneration function
export const openaiImageGeneration = async (prompt, model = 'dall-e-3') => {
  let usersOpenaiKey = localStorage.getItem('openai_api_key') || "";
  let userID = localStorage.getItem('userID') || "";
  let balanceKey = `${userID}_balance`;
  let balance = localStorage.getItem(balanceKey) || 0;

  const response = await fetch(firebaseConfig.openaiImageGenerationURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      model,
      usersOpenaiKey,
      balance
    }),
  });

  const data = await response.json();
  return data.response;
}

// openaiEmbed function
export const openaiEmbed = async (text) => {
  try {
    let usersOpenaiKey = localStorage.getItem('openai_api_key') || "";
    let userID = localStorage.getItem('userID') || "";
    let balanceKey = `${userID}_balance`;
    let balance = localStorage.getItem(balanceKey) || 0;

    if (usersOpenaiKey === "" && (Number(balance) <= 0 || balance === "NaN")) {
      return "You have no API key or your balance is too low to use. Please add more tokens in the settings page.";
    }

    const response = await fetch(firebaseConfig.openaiEmbedURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        usersOpenaiKey,
        balance
      }),
    });

    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
    alert("Please check your OpenAI API Key or your OpenAI account.");
    return "";
  }
}