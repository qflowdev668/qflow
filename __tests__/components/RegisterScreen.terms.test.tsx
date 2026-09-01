/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
import { RegisterScreen } from "@/components/qflow/screens/register-screen"

jest.mock("@/lib/app-context", () => ({
  useApp: () => ({
    register: jest.fn(),
    loginWithGoogle: jest.fn(),
    navigateTo: jest.fn(),
    isAuthLoading: false,
    authError: null,
    clearAuthError: jest.fn(),
  }),
}))

jest.mock("@/hooks/use-t", () => ({
  useT: () =>
    new Proxy(
      {},
      {
        get: (_t, prop: string) => {
          const labels: Record<string, string> = {
            createAccount: "Create account",
            fullName: "Full name",
            emailAddress: "Email",
            password: "Password",
            confirmPassword: "Confirm password",
            agreeToThe: "I agree to the",
            privacyPolicy: "Privacy Policy",
            andTerms: "and",
            termsOfService: "Terms of Service",
            notificationConsentOptional: "Optional notifications",
            alreadyHaveAccount: "Already have an account?",
            login: "Login",
            privacyModalTitle: "How QFlow uses your data",
            privacyWhatWeCollect: "What we collect:",
            privacyCollectNameEmail: "Name",
            privacyCollectQueueHistory: "History",
            privacyCollectLocationSelections: "Places",
            privacyWhatWeDontDo: "What we do not do:",
            privacyNeverSell: "Never sell",
            privacyNeverShare: "Never share",
            privacyNoIdStorage: "No ID",
            privacyYourRights: "Rights",
            privacyRequestData: "Request",
            privacyDeleteAccount: "Delete",
            privacyCorrectInfo: "Correct",
            privacyDataRetention: "Retention",
            privacyQueueHistoryRetention: "12 months",
            privacyAccountDataRetention: "Until delete",
            privacyContact: "Contact:",
            termsModalTitle: "Terms of Service",
            termsWhatYouAgree: "When you use QFlow, you agree to:",
            termsUseForQueues: "Use fairly",
            termsAccurateInfo: "Be accurate",
            termsRespectStaff: "Be respectful",
            termsOurCommitments: "What QFlow commits to:",
            termsKeepServiceRunning: "Keep running",
            termsProtectPrivacy: "Protect privacy",
            termsFairAccess: "Fair access",
            termsContact: "Questions:",
            close: "Close",
            register: "Register",
            continueWithGoogle: "Continue with Google",
            orContinueWith: "or",
          }
          return labels[prop] ?? prop
        },
      }
    ),
}))

jest.mock("@/components/qflow/top-bar", () => ({
  TopBar: () => <div data-testid="top-bar" />,
}))

jest.mock("@/components/qflow/password-rules", () => ({
  PasswordRules: () => null,
}))

describe("RegisterScreen terms/privacy buttons", () => {
  it("opens Terms of Service modal when terms button is clicked", () => {
    render(<RegisterScreen />)
    fireEvent.click(screen.getByLabelText(/^terms of service$/i))
    expect(screen.getByRole("heading", { name: /terms of service/i })).toBeInTheDocument()
    expect(screen.getByText(/use fairly/i)).toBeInTheDocument()
  })

  it("opens Privacy Policy modal when privacy button is clicked", () => {
    render(<RegisterScreen />)
    fireEvent.click(screen.getByLabelText(/^privacy policy$/i))
    expect(screen.getByText(/how qflow uses your data/i)).toBeInTheDocument()
  })
})
