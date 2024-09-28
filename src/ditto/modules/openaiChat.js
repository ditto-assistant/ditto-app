import { firebaseConfig } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";

// import { app } from "../../control/firebase";
import { auth } from "../../control/firebase";

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
    if (!auth.currentUser) {
      return "You are not logged in. Please log in to use this feature.";
    }
    const requestBody = {
      data: {
        userID,
        userPrompt,
        systemPrompt,
        model,
        imageURL,
        usersOpenaiKey,
        // balance
      }
    }
    const tok = await auth.currentUser.getIdToken();
    const response = await fetch(firebaseConfig.openAIChatURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tok}`
      },
      body: JSON.stringify(requestBody),
    });
    // Handle the response stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // console.log(chunk)
      const match = chunk.match(/^\{"result": "(.*)"}/);
      if (match) {
        responseMessage = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
    }
    // replace ALL unicode characters with their ASCII equivalent
    responseMessage = responseMessage.replace(/\\u[0-9A-F]{4}/gi, (match) => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16)));
    return responseMessage;
  } catch (error) {
    console.error("Error in openaiChat:", error);
    return "An error occurred. Please try again later.";
  }
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
    return data.embedding;
  } catch (error) {
    console.error(error);
    alert("Please check your OpenAI API Key or your OpenAI account.");
    return "";
  }
}

// getExamples function
export const getRelevantExamples = async (embedding, k) => {
  console.log("Getting examples");
  try {
    const response = await fetch(firebaseConfig.getExamplesURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embedding: embedding,
        k
      }),
    });

    const data = await response.json();
    return data.examples;
  } catch (error) {
    console.error(error);
    alert("Please check your OpenAI API Key or your OpenAI account.");
    return [];
  }
}