import { describe, it, expect, beforeEach, mock } from "bun:test"
import { render, screen, fireEvent } from "@testing-library/react"
import { ComposeProvider } from "@/contexts/ComposeContext"
import ComposeModal from "./ComposeModal"

// Mock the platform hook
mock.module("@/hooks/usePlatform", () => ({
  usePlatform: mock(() => ({ isMobile: false })),
}))

// Mock the theme provider
mock.module("next-themes", () => ({
  useTheme: mock(() => ({ theme: "light" })),
}))

describe("ComposeModal", () => {
  const mockComposeContext = {
    message: "Test message",
    setMessage: mock(() => {}),
    handleSubmit: mock(() => {}),
    isWaitingForResponse: false,
    isOpen: true,
    setIsOpen: mock(() => {}),
    closeComposeModal: mock(() => {}),
  }

  beforeEach(() => {
    mock.restore()
  })

  it("should focus textarea and place cursor at end when modal opens", () => {
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <ComposeProvider value={mockComposeContext}>{children}</ComposeProvider>
    )

    render(
      <TestWrapper>
        <ComposeModal />
      </TestWrapper>
    )

    const textarea = screen.getByPlaceholderText("Message Ditto")
    expect(textarea).toBeTruthy()
    expect(document.activeElement).toBe(textarea)

    // Verify cursor position is at the end
    expect((textarea as HTMLTextAreaElement).selectionStart).toBe(
      mockComposeContext.message.length
    )
    expect((textarea as HTMLTextAreaElement).selectionEnd).toBe(
      mockComposeContext.message.length
    )
  })

  it("should not focus textarea when modal is closed", () => {
    const closedContext = { ...mockComposeContext, isOpen: false }
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <ComposeProvider value={closedContext}>{children}</ComposeProvider>
    )

    render(
      <TestWrapper>
        <ComposeModal />
      </TestWrapper>
    )

    // Modal should not be visible when closed
    expect(screen.queryByPlaceholderText("Message Ditto")).toBeFalsy()
  })

  it("should handle keyboard shortcut for submission", () => {
    const TestWrapper = ({ children }: { children: React.ReactNode }) => (
      <ComposeProvider value={mockComposeContext}>{children}</ComposeProvider>
    )

    render(
      <TestWrapper>
        <ComposeModal />
      </TestWrapper>
    )

    const textarea = screen.getByPlaceholderText("Message Ditto")

    // Simulate Cmd+Enter keypress
    fireEvent.keyDown(window, {
      key: "Enter",
      metaKey: true,
      preventDefault: mock(() => {}),
    })

    expect(mockComposeContext.handleSubmit).toHaveBeenCalled()
    expect(mockComposeContext.closeComposeModal).toHaveBeenCalled()
  })
})