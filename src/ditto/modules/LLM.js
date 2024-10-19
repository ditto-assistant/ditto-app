import { auth } from "../../control/firebase";
import { routes } from "../../firebaseConfig";

export async function promptLLM(userPrompt, systemPrompt, model = 'gemini-1.5-flash', imageURL = "") {
  let responseMessage = "";
  let retries = 0;
  const maxRetries = 3;
  while (retries < maxRetries) {
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
      const response = await fetch(routes.prompt, {
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
        responseMessage += chunk;
      }
      // console.log("responseMessage:", responseMessage);
      if (responseMessage.slice(-2) === "\\n") {
        responseMessage = responseMessage.slice(0, -2);
      }
      let responseString = "";
      try {
        responseString = JSON.parse(responseMessage).result;
      } catch (error) {
        console.log("message:", responseMessage);
        console.error("Error in promptLLM:", error);
        retries++;
        console.log("Retry: ", retries);
        // return "An error occurred. Please try again.";
      }
      responseString = responseString.replace(/\\u[0-9A-F]{4}/gi, (match) => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16)));
      return responseString.trim();
    } catch (error) {
      console.error("Error in promptLLM:", error);
      retries++;
      console.log("Retry: ", retries);
      // return "An error occurred. Please try again.";
    }
  }
  console.error("Error in promptLLM: Max retries reached.");
  return "An error occurred. Please try again.";
}

// openaiImageGeneration function
export async function openaiImageGeneration(prompt, model = 'dall-e-3') {
  if (!auth.currentUser) {
    return "You are not logged in. Please log in to use this feature.";
  }
  let userID = auth.currentUser.uid;
  let tok = await auth.currentUser.getIdToken();
  // TODO: handle balance server side
  const response = await fetch(routes.imageGeneration, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${tok}`
    },
    body: JSON.stringify({
      userID,
      prompt,
      model,
    }),
  });
  return await response.text();
}

export async function textEmbed(text) {
  try {
    if (!auth.currentUser) {
      return "You are not logged in. Please log in to use this feature.";
    }
    const tok = await auth.currentUser.getIdToken();
    const userID = auth.currentUser.uid;
    let usersOpenaiKey = localStorage.getItem('openai_api_key') || "";
    let balanceKey = `${userID}_balance`;
    let balance = localStorage.getItem(balanceKey) || 0;

    if (usersOpenaiKey === "" && (Number(balance) <= 0 || balance === "NaN")) {
      return "You have no tokens or your balance is too low to use. Please add more tokens in the settings page.";
    }

    const response = await fetch(routes.embed, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tok}`
      },
      body: JSON.stringify({
        userID,
        text,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    alert("Error. Please check your balance or contact support.");
    return "";
  }
}

// getExamples function
export async function getRelevantExamples(embedding, k) {
  console.log("Getting examples");
  try {
    if (!auth.currentUser) {
      return "You are not logged in. Please log in to use this feature.";
    }

    const tok = await auth.currentUser.getIdToken();
    const userID = auth.currentUser.uid;
    const response = await fetch(routes.searchExamples, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tok}`
      },
      body: JSON.stringify({
        embedding,
        k,
        userID,
      }),
    });
    return await response.text();

  } catch (error) {
    console.error(error);
    alert("Error. Please check your balance or contact support.");
    return [];
  }
}