"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export type UserRole = "user" | "staff" | "admin"

export type QueueStatus = "waiting" | "almost" | "your-turn" | "served"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export interface Location {
  id: string
  name: string
  type: "clinic" | "bank" | "government" | "other"
  address: string
  distance: string
  queueCount: number
  waitTime: number
  capacity: number
  isOpen: boolean
  coordinates: { lat: number; lng: number }
  description?: string
}

export interface QueueEntry {
  id: string
  locationId: string
  locationName: string
  locationAddress: string
  position: number
  totalInQueue: number
  estimatedWait: number
  status: QueueStatus
  joinedAt: Date
}

export interface Notification {
  id: string
  message: string
  timestamp: Date
  read: boolean
  icon: "queue" | "turn" | "feedback" | "info"
}

export interface QueueHistoryItem {
  id: string
  locationName: string
  date: Date
  status: "completed" | "cancelled" | "no-show"
}

interface AppContextType {
  // Auth
  currentUser: User | null
  isAuthenticated: boolean
  login: (email: string, password: string, role?: UserRole) => void
  logout: () => void
  register: (name: string, email: string, password: string, role: UserRole) => void
  
  // Navigation
  currentScreen: string
  navigateTo: (screen: string) => void
  
  // Queue
  activeQueue: QueueEntry | null
  joinQueue: (location: Location) => void
  leaveQueue: () => void
  
  // Staff
  currentlyServing: { ticketNumber: string; waitTime: number } | null
  callNext: () => void
  completeService: () => void
  skipNoShow: () => void
  isOnBreak: boolean
  toggleBreak: () => void
  
  // Data
  locations: Location[]
  notifications: Notification[]
  queueHistory: QueueHistoryItem[]
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  
  // Admin
  addLocation: (location: Omit<Location, "id">) => void
  updateLocation: (id: string, location: Partial<Location>) => void
  deleteLocation: (id: string) => void
  
  // Onboarding
  hasCompletedOnboarding: boolean
  completeOnboarding: () => void
}

const mockLocations: Location[] = [
  {
    id: "1",
    name: "Hillbrow Clinic",
    type: "clinic",
    address: "123 Pretoria St, Hillbrow, Johannesburg",
    distance: "1.2 km",
    queueCount: 12,
    waitTime: 25,
    capacity: 50,
    isOpen: true,
    coordinates: { lat: -26.1868, lng: 28.0459 },
    description: "Public health clinic offering general healthcare services."
  },
  {
    id: "2",
    name: "ABSA Bank Sandton",
    type: "bank",
    address: "15 Alice Lane, Sandton, Johannesburg",
    distance: "3.5 km",
    queueCount: 8,
    waitTime: 15,
    capacity: 30,
    isOpen: true,
    coordinates: { lat: -26.1076, lng: 28.0567 },
    description: "Full-service bank branch with personal and business banking."
  },
  {
    id: "3",
    name: "Home Affairs Johannesburg",
    type: "government",
    address: "77 Harrison St, Johannesburg CBD",
    distance: "2.1 km",
    queueCount: 45,
    waitTime: 90,
    capacity: 100,
    isOpen: true,
    coordinates: { lat: -26.2041, lng: 28.0473 },
    description: "Government department for IDs, passports, and civic services."
  },
  {
    id: "4",
    name: "Netcare Clinic Rosebank",
    type: "clinic",
    address: "14 Sturdee Ave, Rosebank",
    distance: "4.2 km",
    queueCount: 5,
    waitTime: 10,
    capacity: 25,
    isOpen: true,
    coordinates: { lat: -26.1456, lng: 28.0436 },
    description: "Private medical clinic with emergency services."
  },
  {
    id: "5",
    name: "FNB Bank Melrose Arch",
    type: "bank",
    address: "Melrose Boulevard, Melrose Arch",
    distance: "5.8 km",
    queueCount: 3,
    waitTime: 8,
    capacity: 20,
    isOpen: false,
    coordinates: { lat: -26.1342, lng: 28.0689 },
    description: "Modern banking facility with digital services."
  },
  {
    id: "6",
    name: "SARS Randburg",
    type: "government",
    address: "45 Republic Rd, Randburg",
    distance: "8.3 km",
    queueCount: 28,
    waitTime: 55,
    capacity: 60,
    isOpen: true,
    coordinates: { lat: -26.0936, lng: 27.9894 },
    description: "Tax services and revenue collection office."
  }
]

const mockNotifications: Notification[] = [
  {
    id: "1",
    message: "Queue moving fast — 3 people ahead",
    timestamp: new Date(Date.now() - 5 * 60000),
    read: false,
    icon: "queue"
  },
  {
    id: "2", 
    message: "It's almost your turn at Hillbrow Clinic",
    timestamp: new Date(Date.now() - 15 * 60000),
    read: false,
    icon: "turn"
  },
  {
    id: "3",
    message: "You've been served. Rate your experience",
    timestamp: new Date(Date.now() - 60 * 60000),
    read: true,
    icon: "feedback"
  }
]

const mockQueueHistory: QueueHistoryItem[] = [
  {
    id: "1",
    locationName: "Hillbrow Clinic",
    date: new Date(Date.now() - 2 * 24 * 60 * 60000),
    status: "completed"
  },
  {
    id: "2",
    locationName: "ABSA Bank Sandton",
    date: new Date(Date.now() - 5 * 24 * 60 * 60000),
    status: "completed"
  },
  {
    id: "3",
    locationName: "Home Affairs Johannesburg",
    date: new Date(Date.now() - 7 * 24 * 60 * 60000),
    status: "cancelled"
  }
]

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentScreen, setCurrentScreen] = useState("splash")
  const [activeQueue, setActiveQueue] = useState<QueueEntry | null>(null)
  const [locations, setLocations] = useState<Location[]>(mockLocations)
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [currentlyServing, setCurrentlyServing] = useState<{ ticketNumber: string; waitTime: number } | null>(null)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [queueHistory] = useState<QueueHistoryItem[]>(mockQueueHistory)

  const login = (email: string, _password: string, role: UserRole = "user") => {
    const mockUser: User = {
      id: "1",
      name: role === "admin" ? "Admin User" : role === "staff" ? "Staff Member" : "Thabo Mbeki",
      email,
      role,
    }
    setCurrentUser(mockUser)
    
    if (role === "admin") {
      setCurrentScreen("admin-dashboard")
    } else if (role === "staff") {
      setCurrentScreen("staff-dashboard")
    } else {
      setCurrentScreen("home")
    }
  }

  const logout = () => {
    setCurrentUser(null)
    setActiveQueue(null)
    setCurrentlyServing(null)
    setCurrentScreen("login")
  }

  const register = (name: string, email: string, _password: string, role: UserRole) => {
    const mockUser: User = {
      id: "1",
      name,
      email,
      role,
    }
    setCurrentUser(mockUser)
    
    if (role === "admin") {
      setCurrentScreen("admin-dashboard")
    } else if (role === "staff") {
      setCurrentScreen("staff-dashboard")
    } else {
      setCurrentScreen("home")
    }
  }

  const navigateTo = (screen: string) => {
    setCurrentScreen(screen)
  }

  const joinQueue = (location: Location) => {
    const entry: QueueEntry = {
      id: Date.now().toString(),
      locationId: location.id,
      locationName: location.name,
      locationAddress: location.address,
      position: location.queueCount + 1,
      totalInQueue: location.queueCount + 1,
      estimatedWait: location.waitTime + 5,
      status: "waiting",
      joinedAt: new Date()
    }
    setActiveQueue(entry)
    setCurrentScreen("my-queue")
  }

  const leaveQueue = () => {
    setActiveQueue(null)
    setCurrentScreen("home")
  }

  const callNext = () => {
    setCurrentlyServing({
      ticketNumber: `#${String(Math.floor(Math.random() * 100)).padStart(3, "0")}`,
      waitTime: Math.floor(Math.random() * 30) + 5
    })
    setCurrentScreen("staff-serving")
  }

  const completeService = () => {
    setCurrentlyServing(null)
    setCurrentScreen("staff-dashboard")
  }

  const skipNoShow = () => {
    setCurrentlyServing(null)
    setCurrentScreen("staff-dashboard")
  }

  const toggleBreak = () => {
    setIsOnBreak(!isOnBreak)
  }

  const markNotificationRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const addLocation = (location: Omit<Location, "id">) => {
    const newLocation: Location = {
      ...location,
      id: Date.now().toString()
    }
    setLocations(prev => [...prev, newLocation])
  }

  const updateLocation = (id: string, updates: Partial<Location>) => {
    setLocations(prev => 
      prev.map(loc => loc.id === id ? { ...loc, ...updates } : loc)
    )
  }

  const deleteLocation = (id: string) => {
    setLocations(prev => prev.filter(loc => loc.id !== id))
  }

  const completeOnboarding = () => {
    setHasCompletedOnboarding(true)
    setCurrentScreen("login")
  }

  return (
    <AppContext.Provider value={{
      currentUser,
      isAuthenticated: !!currentUser,
      login,
      logout,
      register,
      currentScreen,
      navigateTo,
      activeQueue,
      joinQueue,
      leaveQueue,
      currentlyServing,
      callNext,
      completeService,
      skipNoShow,
      isOnBreak,
      toggleBreak,
      locations,
      notifications,
      queueHistory,
      markNotificationRead,
      markAllNotificationsRead,
      addLocation,
      updateLocation,
      deleteLocation,
      hasCompletedOnboarding,
      completeOnboarding
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
