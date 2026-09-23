/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { HelpSupportScreen } from "@/components/qflow/screens/help-support-screen"

const navigateTo = jest.fn()

jest.mock("@/hooks/use-t", () => ({
  useT: () =>
    new Proxy(
      {},
      {
        get: (_t, prop: string) => {
          const labels: Record<string, string> = {
            helpSupport: "Help and support",
            helpIntro: "Answers to common questions",
            helpSectionCommonQuestions: "Common questions",
            helpFaqJoinQ: "How do I join a queue?",
            helpFaqJoinA: "Open Home or Map and tap Join.",
            helpFaqMissTurnQ: "What happens if I miss my turn?",
            helpFaqMissTurnA: "You may be marked as a no-show.",
            helpFaqTwoQueuesQ: "Can I be in two queues at once?",
            helpFaqTwoQueuesA: "No. One active queue at a time.",
            helpFaqTurnQ: "How do I know when it's my turn?",
            helpFaqTurnA: "Watch My line and turn on alerts.",
            helpFaqPriorityQ: "What is priority service?",
            helpFaqPriorityA: "Emergency and fast-track go first.",
            helpSectionContact: "Contact and support",
            helpContactDesc: "Email our support team.",
            helpSendMessage: "Send us a message",
            helpSectionTechnical: "Technical issues",
            helpCheckSystemStatus: "Check system status",
            helpClearAppData: "Clear app data and restart",
            helpClearingData: "Clearing…",
            helpClearAppDataHint: "Clears preferences on this device.",
            helpSectionAccessibility: "Accessibility",
            helpAccessibilitySettings: "Accessibility settings",
            staffOrAdminContactHint: "Staff or admin?",
            staffOrAdminContactLink: "Contact your manager",
          }
          return labels[prop] ?? prop
        },
      }
    ),
}))

jest.mock("@/lib/app-context", () => ({
  useApp: () => ({ navigateTo }),
}))

jest.mock("@/hooks/use-chrome-insets", () => ({
  useChromeInsets: () => ({ paddingBottom: "0px", fixedFooterBottom: "0px" }),
}))

jest.mock("@/components/qflow/illustrations/queue-scenes", () => ({
  HelpSupportScene: () => <div data-testid="help-scene" />,
}))

describe("HelpSupportScreen", () => {
  it("renders FAQ content, support mailto, and status link", () => {
    render(<HelpSupportScreen />)

    expect(screen.getByTestId("help-support-screen")).toBeInTheDocument()
    expect(screen.getByTestId("help-faq")).toHaveTextContent("How do I join a queue?")
    expect(screen.getByTestId("help-faq")).toHaveTextContent("What is priority service?")
    expect(screen.getByTestId("help-support-email")).toHaveAttribute(
      "href",
      "mailto:support@qflow.co.za"
    )
    expect(screen.getByText("Check system status")).toBeInTheDocument()
    expect(screen.getByText("Accessibility settings")).toBeInTheDocument()
  })
})
