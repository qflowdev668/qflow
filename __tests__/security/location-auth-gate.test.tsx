/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react"
import { LocationDetailPage } from "@/components/qflow/location-detail-page"
import { sampleLocation, createAppMock } from "@/__tests__/helpers/mock-app"

const replace = jest.fn()

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "_" }),
  useSearchParams: () =>
    new URLSearchParams("id=aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
  usePathname: () => "/location/_",
  useRouter: () => ({
    push: jest.fn(),
    replace,
    prefetch: jest.fn(),
  }),
}))

jest.mock("@/lib/app-context", () => ({
  useApp: jest.fn(),
}))

jest.mock("@/components/qflow/join-queue-drawer", () => ({
  JoinQueueDrawer: ({ open }: { open: boolean }) =>
    open ? <div data-testid="join-drawer">Hillbrow Clinic</div> : null,
}))

import { useApp } from "@/lib/app-context"

describe("LocationDetailPage auth gate", () => {
  beforeEach(() => {
    replace.mockClear()
    ;(useApp as jest.Mock).mockReset()
  })

  it("renders an empty shell with no location data while unauthenticated", () => {
    ;(useApp as jest.Mock).mockReturnValue(
      createAppMock({
        currentUser: null,
        isAuthenticated: false,
        isAuthLoading: false,
        locations: [sampleLocation],
        selectedLocation: sampleLocation,
        setSelectedLocation: jest.fn(),
      })
    )

    const { container } = render(<LocationDetailPage />)
    expect(screen.queryByTestId("join-drawer")).not.toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Hillbrow|Pretoria/)
    expect(container.querySelector("[aria-busy='true']")).toBeTruthy()
  })

  it("does not open the join drawer while auth is still loading", () => {
    ;(useApp as jest.Mock).mockReturnValue(
      createAppMock({
        currentUser: null,
        isAuthenticated: false,
        isAuthLoading: true,
        locations: [sampleLocation],
        selectedLocation: null,
        setSelectedLocation: jest.fn(),
      })
    )

    render(<LocationDetailPage />)
    expect(screen.queryByTestId("join-drawer")).not.toBeInTheDocument()
  })

  it("shows the join drawer only after an authenticated user has a location", async () => {
    const setSelectedLocation = jest.fn()
    ;(useApp as jest.Mock).mockReturnValue(
      createAppMock({
        currentUser: {
          id: "user-1",
          name: "Pat",
          email: "pat@example.com",
          role: "user",
        },
        isAuthenticated: true,
        isAuthLoading: false,
        locations: [sampleLocation],
        selectedLocation: {
          ...sampleLocation,
          id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
        },
        setSelectedLocation,
      })
    )

    render(<LocationDetailPage />)
    await waitFor(() => {
      expect(screen.getByTestId("join-drawer")).toBeInTheDocument()
    })
  })
})
