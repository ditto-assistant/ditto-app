import React from "react"
import useWhatsNew from "@/hooks/useWhatsNew"

/**
 * Test component for manually testing WhatsNew dialog
 * You can import this and render it anywhere in the app to test
 * Different versions of the WhatsNew dialog
 */
const TestWhatsNew: React.FC = () => {
  const { openWhatsNew } = useWhatsNew()

  return (
    <div style={{ padding: "20px" }}>
      <h2>Test What&apos;s New Dialog</h2>
      <p>
        Click the buttons below to test different versions of the What&apos;s
        New dialog
      </p>

      <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
        <button
          onClick={() => openWhatsNew("0.11.54", true)}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Show v0.11.54
        </button>

        <button
          onClick={() => openWhatsNew("0.11.55", true)}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Show v0.11.55
        </button>

        <button
          onClick={() => openWhatsNew("0.11.56", true)}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Show v0.11.56
        </button>

        <button
          onClick={() => openWhatsNew("0.11.57", true)}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Show v0.11.57
        </button>

        <button
          onClick={() => openWhatsNew("0.13.0", true)}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            backgroundColor: "#4CAF50",
            color: "white",
            fontWeight: "bold"
          }}
        >
          Show v0.13.0 (New)
        </button>
      </div>
    </div>
  )
}

export default TestWhatsNew
