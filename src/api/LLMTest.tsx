import React, { useState } from "react"
import { promptLLM, promptLLMV2 } from "./LLM"

/**
 * A simple test component to compare the V1 and V2 prompt endpoints
 */
const LLMTest: React.FC = () => {
  const [userPrompt, setUserPrompt] = useState(
    "Tell me about a fun adventure in 5 sentences."
  )
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful AI assistant."
  )
  const [model, setModel] = useState("gemini-1.5-flash")
  const [v1Response, setV1Response] = useState("")
  const [v2Response, setV2Response] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const testV1 = async () => {
    setIsLoading(true)
    setV1Response("")
    try {
      const response = await promptLLM(
        userPrompt,
        systemPrompt,
        model,
        "",
        (text) => {
          setV1Response((prev) => prev + text)
        }
      )
      console.log("V1 final response:", response)
    } catch (error) {
      console.error("Error in V1 test:", error)
      setV1Response(
        "Error: " + (error instanceof Error ? error.message : String(error))
      )
    } finally {
      setIsLoading(false)
    }
  }

  const testV2 = async () => {
    setIsLoading(true)
    setV2Response("")
    try {
      const response = await promptLLMV2(
        userPrompt,
        systemPrompt,
        model,
        "",
        (text) => {
          setV2Response((prev) => prev + text)
        }
      )
      console.log("V2 final response:", response)
    } catch (error) {
      console.error("Error in V2 test:", error)
      setV2Response(
        "Error: " + (error instanceof Error ? error.message : String(error))
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>LLM API Test</h1>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          User Prompt:
        </label>
        <textarea
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          style={{ width: "100%", height: "80px", padding: "8px" }}
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>
          System Prompt:
        </label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          style={{ width: "100%", height: "80px", padding: "8px" }}
        />
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "5px" }}>Model:</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        >
          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
          <option value="claude-3-haiku">Claude 3 Haiku</option>
          <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
          <option value="gpt-4o">GPT-4o</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={testV1}
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            cursor: isLoading ? "not-allowed" : "pointer"
          }}
        >
          Test V1 Endpoint
        </button>
        <button
          onClick={testV2}
          disabled={isLoading}
          style={{
            padding: "10px 20px",
            cursor: isLoading ? "not-allowed" : "pointer"
          }}
        >
          Test V2 Endpoint
        </button>
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        <div style={{ flex: 1 }}>
          <h2>V1 Response:</h2>
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              minHeight: "200px",
              whiteSpace: "pre-wrap"
            }}
          >
            {v1Response}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <h2>V2 Response:</h2>
          <div
            style={{
              border: "1px solid #ccc",
              padding: "10px",
              minHeight: "200px",
              whiteSpace: "pre-wrap"
            }}
          >
            {v2Response}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LLMTest
