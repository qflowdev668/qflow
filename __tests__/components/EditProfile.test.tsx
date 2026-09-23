/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { EditProfileScreen } from "@/components/qflow/screens/edit-profile-screen"
import { AVATAR_MAX_BYTES } from "@/lib/avatar-upload"

const updateProfile = jest.fn().mockResolvedValue(true)
const navigateTo = jest.fn()
const clearAuthError = jest.fn()

let mockUser = {
  id: "u1",
  name: "Bongani Mathew Miya",
  email: "miyabongani71@gmail.com",
  role: "user" as const,
  avatar: undefined as string | undefined,
}

jest.mock("@/hooks/use-t", () => ({
  useT: () =>
    new Proxy(
      {},
      {
        get: (_t, prop: string) => {
          const labels: Record<string, string> = {
            editProfile: "Edit profile",
            editProfileDesc: "Update the name other people see.",
            fullName: "Full name",
            emailLockedHint: "Email cannot be changed here.",
            save: "Save",
            saving: "Saving…",
            profileSaved: "Profile saved",
            profileNameTooShort: "Name is too short",
            changePhoto: "Change profile photo",
            removePhoto: "Remove photo",
            avatarTooLarge: "Photo must be under 5 MB.",
            avatarInvalidType: "Please choose a JPEG, PNG, or WebP image.",
            avatarUploadFailed: "Could not update photo. Try again.",
            avatarUpdated: "Photo updated.",
          }
          return labels[prop] ?? prop
        },
      }
    ),
}))

jest.mock("@/lib/app-context", () => ({
  useApp: () => ({
    currentUser: mockUser,
    updateProfile,
    navigateTo,
    authError: null,
    clearAuthError,
  }),
}))

jest.mock("@/hooks/use-chrome-insets", () => ({
  useChromeInsets: () => ({ paddingBottom: "0px" }),
}))

jest.mock("@/components/qflow/top-bar", () => ({
  TopBar: ({ title }: { title: string }) => <header>{title}</header>,
}))

const mockApiFetch = jest.fn()

jest.mock("@/lib/api-client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  formatApiErrorMessage: () => "Could not update photo. Try again.",
}))

jest.mock("@/lib/avatar-upload", () => {
  const actual = jest.requireActual("@/lib/avatar-upload")
  return {
    ...actual,
    compressAvatarImage: jest.fn(async (file: File) => file),
  }
})

describe("EditProfileScreen", () => {
  beforeEach(() => {
    updateProfile.mockClear()
    navigateTo.mockClear()
    mockApiFetch.mockReset()
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, avatarUrl: "https://example.com/avatars/u1.jpg" }),
    })
    mockUser = {
      id: "u1",
      name: "Bongani Mathew Miya",
      email: "miyabongani71@gmail.com",
      role: "user",
      avatar: undefined,
    }
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: jest.fn(() => "blob:preview"),
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: jest.fn(),
    })
  })

  it("keeps Save disabled until the name changes", () => {
    render(<EditProfileScreen />)
    expect(screen.getByTestId("edit-profile-save")).toBeDisabled()
    expect(screen.getByTestId("edit-profile-unchanged-hint")).toBeInTheDocument()
  })

  it("enables Save with valid changed input and calls updateProfile", async () => {
    render(<EditProfileScreen />)
    const input = screen.getByPlaceholderText("Full name")
    fireEvent.change(input, { target: { value: "Bongani M" } })

    expect(screen.getByTestId("edit-profile-save")).not.toBeDisabled()
    fireEvent.click(screen.getByTestId("edit-profile-save"))

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ name: "Bongani M" })
    })
    expect(await screen.findByText("Profile saved")).toBeInTheDocument()
  })

  it("shows a preview after selecting a valid image", async () => {
    render(<EditProfileScreen />)
    const file = new File([new Uint8Array([1, 2, 3])], "me.jpg", {
      type: "image/jpeg",
    })
    fireEvent.change(screen.getByTestId("avatar-file-input"), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(screen.getByTestId("user-avatar-photo")).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ avatarUrl: expect.any(String) })
      )
    })
    expect(await screen.findByTestId("avatar-saved")).toHaveTextContent("Photo updated.")
  })

  it("shows a validation error for oversized files", async () => {
    render(<EditProfileScreen />)
    const big = new File([new Uint8Array(AVATAR_MAX_BYTES + 1)], "big.jpg", {
      type: "image/jpeg",
    })
    Object.defineProperty(big, "size", { value: AVATAR_MAX_BYTES + 1 })

    fireEvent.change(screen.getByTestId("avatar-file-input"), {
      target: { files: [big] },
    })

    expect(await screen.findByTestId("avatar-error")).toHaveTextContent(
      "Photo must be under 5 MB."
    )
    expect(updateProfile).not.toHaveBeenCalled()
  })

  it("shows a validation error for non-image files", async () => {
    render(<EditProfileScreen />)
    const pdf = new File([new Uint8Array([1])], "doc.pdf", { type: "application/pdf" })
    fireEvent.change(screen.getByTestId("avatar-file-input"), {
      target: { files: [pdf] },
    })

    expect(await screen.findByTestId("avatar-error")).toHaveTextContent(
      "Please choose a JPEG, PNG, or WebP image."
    )
  })
})
