import { render } from "@testing-library/react"
import { axe, toHaveNoViolations } from "jest-axe"

expect.extend(toHaveNoViolations)

import { PasswordRules } from "@/components/qflow/password-rules"

describe("Accessibility (jest-axe)", () => {
  it("PasswordRules has no axe violations", async () => {
    const { container } = render(
      <PasswordRules
        password="Abcdefghijk1!"
        labels={{
          passwordRuleLength: "12+ characters",
          passwordRuleLower: "Lowercase",
          passwordRuleUpper: "Uppercase",
          passwordRuleNumber: "Number",
          passwordRuleSymbol: "Symbol",
        }}
      />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("simple status region has no axe violations", async () => {
    const { container } = render(
      <div role="status" aria-live="polite">
        You are #5 in the queue
      </div>
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
