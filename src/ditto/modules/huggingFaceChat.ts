import { HfInference } from "@huggingface/inference";

export const huggingFaceChat = async (prompt: string) => {
  let hugging_face_api_key = localStorage.getItem("hugging_face_key");
  // check if hugging_face_api_key is null
  if (hugging_face_api_key === null) {
    hugging_face_api_key = "";
  }
  const inference = new HfInference(hugging_face_api_key);
  let response = "";
  for await (const chunk of inference.chatCompletionStream({
    model: "mistralai/Mistral-Nemo-Instruct-2407",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1024,
  })) {
    response += chunk.choices[0]?.delta?.content || "";
  }
  return response;
};

export const huggingFaceEmbed = async (text: string) => {
  let hugging_face_api_key = localStorage.getItem("hugging_face_key");
  const data = { inputs: text };
  const response = await fetch(
    "https://api-inference.huggingface.co/models/intfloat/multilingual-e5-large-instruct",
    {
      headers: {
        Authorization: `Bearer ${hugging_face_api_key}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  const result = await response.json();
  return result;
};
