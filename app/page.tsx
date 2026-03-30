"use client"

import { AppProvider, useApp } from "@/lib/app-context"

// Auth Screens
import { SplashScreen } from "@/components/qflow/screens/splash-screen"
import { OnboardingScreen } from "@/components/qflow/screens/onboarding-screen"
import { LoginScreen } from "@/components/qflow/screens/login-screen"
import { RegisterScreen } from "@/components/qflow/screens/register-screen"

// User Screens
import { HomeScreen } from "@/components/qflow/screens/home-screen"
import { MapScreen } from "@/components/qflow/screens/map-screen"
import { LocationDetailScreen } from "@/components/qflow/screens/location-detail-screen"
import { JoinQueueConfirmationScreen } from "@/components/qflow/screens/join-queue-confirmation-screen"
import { MyQueueScreen } from "@/components/qflow/screens/my-queue-screen"
import { ProfileScreen } from "@/components/qflow/screens/profile-screen"

// Staff Screens
import { StaffDashboardScreen } from "@/components/qflow/screens/staff-dashboard-screen"
import { StaffServingScreen } from "@/components/qflow/screens/staff-serving-screen"

// Admin Screens
import { AdminDashboardScreen } from "@/components/qflow/screens/admin-dashboard-screen"
import { AddLocationScreen } from "@/components/qflow/screens/add-location-screen"

// Notification & Feedback
import { NotificationsScreen } from "@/components/qflow/screens/notifications-screen"
import { RateExperienceScreen } from "@/components/qflow/screens/rate-experience-screen"

function ScreenRouter() {
  const { currentScreen } = useApp()

  switch (currentScreen) {
    // Auth
    case "splash":
      return <SplashScreen />
    case "onboarding":
      return <OnboardingScreen />
    case "login":
      return <LoginScreen />
    case "register":
      return <RegisterScreen />

    // User
    case "home":
      return <HomeScreen />
    case "map":
      return <MapScreen />
    case "location-detail":
      return <LocationDetailScreen />
    case "join-queue-confirmation":
      return <JoinQueueConfirmationScreen />
    case "my-queue":
      return <MyQueueScreen />
    case "profile":
      return <ProfileScreen />

    // Staff
    case "staff-dashboard":
      return <StaffDashboardScreen />
    case "staff-serving":
      return <StaffServingScreen />

    // Admin
    case "admin-dashboard":
      return <AdminDashboardScreen />
    case "add-location":
      return <AddLocationScreen />

    // Notifications & Feedback
    case "notifications":
      return <NotificationsScreen />
    case "rate-experience":
      return <RateExperienceScreen />

    default:
      return <SplashScreen />
  }
}

export default function QFlowApp() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-background max-w-md mx-auto relative overflow-hidden shadow-2xl">
        <ScreenRouter />
      </div>
    </AppProvider>
  )
}
