// import fs module
const fs = require('fs');

// iport dotenv 
require('dotenv').config({ path: '.env', override: true });

// OPENAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// OPENAI Embedding Function
const getTextEmbeddings = async (text) => {
    try {
        console.log("Getting embeddings");
        let responseEmbeddings; 
        const apiResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                "input": text,
                "model": "text-embedding-3-small",
                "encoding_format": "float"
            })
        });

        const data = await apiResponse.json();
        responseEmbeddings = data.data[0].embedding;
        return responseEmbeddings
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

// load all json files in examples/
const loadExamples = async () => {
    let examples = [];
    const exampleFiles = fs.readdirSync('./modules/examples');
    exampleFiles.forEach(file => {
        const example = require(`./modules/examples/${file}`);
        examples.push(example);
    });
    return examples;
}


// load examples and console.log them
const loadExamplesAndLog = async () => {
    const examples = await loadExamples();
    console.log(examples);
}


// load examples and create an additional key per prompt/response pair called "embedding"
// update the examples with the embeddings and save them to the same json file
// each pair now has three keys "prompt", "response", "embedding"
const createExampleStore = async () => {
    const examples = await loadExamples();
    const updatedExamples = await Promise.all(examples.map(async exampleObj => {
        let newExampleObj = { ...exampleObj };
        let newExamples = await Promise.all(exampleObj.examples.map(async pair => {
            const promptEmbedding = await getTextEmbeddings(pair.prompt);
            const responseEmbedding = await getTextEmbeddings(pair.response);
            const promptAndResponseEmbedding = await getTextEmbeddings(`${pair.prompt} ${pair.response}`);

            return {
                prompt: pair.prompt,
                response: pair.response,
                promptEmbedding,
                responseEmbedding,
                promptAndResponseEmbedding
            }
        }));
        newExampleObj.examples = newExamples;
        return newExampleObj;
    }));

    // save the updated examples to modules/exampleStore.json
    fs.writeFileSync('./modules/exampleStore.json', JSON.stringify(updatedExamples));

}

createExampleStore();