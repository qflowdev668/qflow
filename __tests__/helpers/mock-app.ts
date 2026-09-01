import { getTranslations } from "@/lib/i18n"
import type { Location, StaffQueueItem, ServingCustomer } from "@/lib/app-context"

export const sampleLocation: Location = {
  id: "loc-1",
  name: "Hillbrow Clinic",
  type: "clinic",
  address: "123 Pretoria St",
  distance: "1 km",
  queueCount: 12,
  waitTime: 25,
  capacity: 50,
  isOpen: true,
  coordinates: { lat: -26.18, lng: 28.04 },
}

export const sampleQueue: StaffQueueItem[] = [
  {
    id: "q1",
    position: 1,
    name: "Thabo",
    waitDuration: 5,
    isWalkIn: false,
    priorityType: "emergency",
    priorityCategory: "police",
  },
  {
    id: "q2",
    position: 2,
    name: "Lerato",
    waitDuration: 10,
    isWalkIn: false,
    priorityType: "fast-track",
    priorityCategory: "learner",
  },
  {
    id: "q3",
    position: 3,
    name: "Sipho",
    waitDuration: 15,
    isWalkIn: true,
    priorityType: "standard",
  },
]

export function servingCustomer(
  priorityType: ServingCustomer["priorityType"] = "standard"
): ServingCustomer {
  return {
    id: "serve-1",
    ticketNumber: "047",
    waitTime: 12,
    customerName: "Thabo M",
    priorityType,
    priorityCategory: priorityType === "emergency" ? "police" : priorityType === "fast-track" ? "learner" : undefined,
    isWalkIn: false,
    next: { ticketNumber: "048", waitTime: 8 },
  }
}

/** Minimal useApp() stub for screen tests. */
export function createAppMock(overrides: Record<string, unknown> = {}) {
  return {
    language: "en" as const,
    setLanguage: jest.fn(),
    currentUser: {
      id: "staff-1",
      name: "Staff User",
      email: "staff@example.com",
      role: "staff" as const,
      locationId: "loc-1",
    },
    logout: jest.fn(),
    callNext: jest.fn(),
    serveWalkIn: jest.fn(),
    addWalkIn: jest.fn().mockResolvedValue({ id: "walk-1", position: 3 }),
    isOnBreak: false,
    toggleBreak: jest.fn(),
    locationQueue: sampleQueue,
    staffLocationName: "Hillbrow Clinic",
    shiftSummary: {
      customersServed: 8,
      noShows: 1,
      avgServiceTime: 7,
      queueRemaining: 3,
    },
    locations: [sampleLocation],
    lastSyncedAt: new Date("2026-08-21T10:00:00Z"),
    refreshLocations: jest.fn(),
    refreshStaffQueue: jest.fn(),
    currentlyServing: null as ServingCustomer | null,
    completeService: jest.fn(),
    skipNoShow: jest.fn(),
    demoteToStandard: jest.fn(),
    navigateTo: jest.fn(),
    deleteLocation: jest.fn(),
    setEditingLocation: jest.fn(),
    addLocation: jest.fn(),
    updateLocation: jest.fn(),
    editingLocation: null,
    supabaseEnabled: false,
    completeOnboarding: jest.fn(),
    setLanguage: jest.fn(),
    isAuthenticated: false,
    isAuthLoading: false,
    hasCompletedOnboarding: true,
    activeQueue: null,
    notifications: [],
    ...overrides,
  }
}

export function mockUseT() {
  return {
    useT: () => getTranslations("en"),
    fmt: (template: string, vars: Record<string, string | number>) => {
      let result = template
      for (const [key, value] of Object.entries(vars)) {
        result = result.replaceAll(`{${key}}`, String(value))
      }
      return result
    },
  }
}
