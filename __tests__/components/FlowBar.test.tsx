import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createAppMock, mockUseT, sampleLocation } from "../helpers/mock-app"
import type { QueueEntry } from "@/lib/app-context"

const leaveQueue = jest.fn()

function queueEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    id: "qe-1",
    locationId: sampleLocation.id,
    locationName: sampleLocation.name,
    locationAddress: sampleLocation.address,
    position: 7,
    totalInQueue: 12,
    estimatedWait: 14,
    status: "waiting",
    joinedAt: new Date(),
    priorityType: "standard",
    ...overrides,
  }
}

let activeQueue: QueueEntry | null = null

jest.mock("@/hooks/use-t", () => mockUseT())
jest.mock("@/lib/app-context", () => ({
  useApp: () =>
    createAppMock({
      currentUser: {
        id: "user-1",
        name: "Test",
        email: "t@example.com",
        role: "user",
      },
      activeQueue,
      leaveQueue,
      clearAuthError: jest.fn(),
      authError: null,
      selectedLocation: sampleLocation,
      joinQueue: jest.fn(),
      navigateTo: jest.fn(),
    }),
}))
jest.mock("@/components/qflow/offline-banner", () => ({
  useOfflineStatus: () => false,
}))
jest.mock("framer-motion", () => {
  const React = require("react")
  const passthrough = ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement> & {
    layoutId?: string
    initial?: unknown
    animate?: unknown
    exit?: unknown
    transition?: unknown
    drag?: unknown
    dragConstraints?: unknown
    dragElastic?: unknown
    onDragEnd?: unknown
  }) => {
    const {
      layoutId: _l,
      initial: _i,
      animate: _a,
      exit: _e,
      transition: _t,
      drag: _d,
      dragConstraints: _dc,
      dragElastic: _de,
      onDragEnd: _ode,
      ...rest
    } = props
    return <div {...rest}>{children}</div>
  }
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: passthrough,
      button: ({
        children,
        ...props
      }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => {
        const cleaned = { ...props }
        delete cleaned.layoutId
        delete cleaned.initial
        delete cleaned.animate
        delete cleaned.exit
        delete cleaned.transition
        return <button {...cleaned}>{children}</button>
      },
      span: ({
        children,
        className,
      }: React.HTMLAttributes<HTMLSpanElement>) => (
        <span className={className}>{children}</span>
      ),
    },
    useReducedMotion: () => false,
  }
})

import { FlowBar } from "@/components/qflow/flow-bar"

describe("FlowBar", () => {
  beforeEach(() => {
    activeQueue = null
    leaveQueue.mockClear()
    window.localStorage.clear()
  })

  it("renders nothing with no active queue entry", () => {
    const { container } = render(<FlowBar />)
    expect(container).toBeEmptyDOMElement()
  })

  it("renders collapsed state with an active queue", () => {
    activeQueue = queueEntry()
    render(<FlowBar />)
    const bar = screen.getByTestId("flow-bar")
    expect(bar).toBeInTheDocument()
    expect(bar).toHaveAttribute("data-variant", "standard")
    expect(screen.getByText(sampleLocation.name)).toBeInTheDocument()
    expect(screen.getByTestId("roller-digit")).toHaveAttribute("data-value", "7")
  })

  it("expands and collapses via click", async () => {
    const user = userEvent.setup()
    activeQueue = queueEntry()
    render(<FlowBar />)

    await user.click(screen.getByTestId("flow-bar"))
    expect(await screen.findByTestId("flow-bar-expanded")).toBeInTheDocument()
    expect(screen.getByTestId("join-queue-panel")).toBeInTheDocument()

    await user.click(screen.getByLabelText(/close queue details/i))
    expect(await screen.findByTestId("flow-bar")).toBeInTheDocument()
    expect(screen.queryByTestId("flow-bar-expanded")).not.toBeInTheDocument()
  })

  it("applies emergency variant class", () => {
    activeQueue = queueEntry({ priorityType: "emergency" })
    render(<FlowBar />)
    expect(screen.getByTestId("flow-bar")).toHaveAttribute("data-variant", "emergency")
  })

  it("applies fast-track variant class", () => {
    activeQueue = queueEntry({ priorityType: "fast-track" })
    render(<FlowBar />)
    expect(screen.getByTestId("flow-bar")).toHaveAttribute("data-variant", "fast-track")
  })

  it("shows bell instead of position when it is your turn", () => {
    activeQueue = queueEntry({ status: "your-turn" })
    render(<FlowBar />)
    expect(screen.getByTestId("flow-bar")).toHaveAttribute("data-status", "your-turn")
    expect(screen.queryByTestId("roller-digit")).not.toBeInTheDocument()
  })
})
