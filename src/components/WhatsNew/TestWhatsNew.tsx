import React from "react"
import WhatsNew from "./WhatsNew"
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

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button
          onClick={() => openWhatsNew("0.11.54")}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Show v0.11.54
        </button>

        <button
          onClick={() => openWhatsNew("0.11.55")}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Show v0.11.55
        </button>

        <button
          onClick={() => openWhatsNew("0.11.56")}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Show v0.11.56
        </button>

        <button
          onClick={() => openWhatsNew("0.11.57")}
          style={{
            padding: "8px 16px",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Show v0.11.57
        </button>
      </div>

      {/* Render the WhatsNew component so it's available */}
      <WhatsNew version="0.11.57" />
    </div>
  )
}

export default TestWhatsNew
