const fs = require("fs");
const { promisify } = require("util");
const readFileAsync = promisify(fs.readFile);

class ExampleStore {
  constructor() {
    this.store = [];
  }

  async loadStore(filePath) {
    try {
      const data = await readFileAsync(filePath, "utf8");
      this.store = JSON.parse(data);
    } catch (error) {
      console.error("Error loading example store:", error);
    }
  }

  async getTopKSimilarExamples(embedding, k = 5) {
    try {
      const similarities = await Promise.all(
        this.store.map(async (category) => {
          const categorySimilarities = await Promise.all(
            category.examples.map(async (example) => {
              const exampleEmbedding = example.promptEmbedding;
              const similarity = calculateCosineSimilarity(
                embedding,
                exampleEmbedding
              );
              return { example, similarity };
            })
          );
          return { category, similarities: categorySimilarities };
        })
      );
      const flattenedSimilarities = similarities.flatMap(
        (category) => category.similarities
      );
      let sortedSimilarities = flattenedSimilarities.sort(
        (a, b) => b.similarity - a.similarity
      );
      sortedSimilarities.map((item) => item.example);
      // top k examples
      let topKExamples = sortedSimilarities.slice(0, k);
      // format examples
      let num = 0;
      let examplesList = topKExamples.map((item) => {
        num++;
        return `Example ${num}:\nUser: ${item.example.prompt}\nDitto:\n${item.example.response}\n`;
      });
      const joinedExamplesString = examplesList.join("\n");
      return "\n" + joinedExamplesString;
    } catch (error) {
      console.error("Error retrieving top K similar examples:", error);
      return [];
    }
  }
}

// OPENAI Embedding Function
const calculateEmbedding = async (text) => {
  try {
    console.log("Getting embeddings");
    let responseEmbeddings;
    const apiResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small",
        encoding_format: "float",
      }),
    });
    const data = await apiResponse.json();
    responseEmbeddings = data.data[0].embedding;
    return responseEmbeddings;
  } catch (error) {
    console.error(error);
    return { error: "Error getting embeddings" };
  }
};

const calculateCosineSimilarity = (a, b) => {
  const dot = (a, b) => a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);
  const mag = (vec) => Math.sqrt(dot(vec, vec));
  return dot(a, b) / (mag(a) * mag(b));
};

module.exports = ExampleStore;
