"use client"

import { useState } from "react"
import { useApp, UserRole } from "@/lib/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TopBar } from "@/components/qflow/top-bar"
import { Eye, EyeOff, User, Mail, Lock, ChevronDown } from "lucide-react"

export function RegisterScreen() {
  const { register, navigateTo } = useApp()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [role, setRole] = useState<UserRole>("user")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showRoleDropdown, setShowRoleDropdown] = useState(false)

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      return
    }
    register(name, email, password, role)
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <TopBar 
        title="Create Account" 
        showBack 
        backTo="login" 
      />

      {/* Form */}
      <form onSubmit={handleRegister} className="flex-1 px-6 py-6 space-y-4 overflow-auto">
        <div className="space-y-4">
          {/* Full Name */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="pl-11 h-12"
              required
            />
          </div>

          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11 h-12"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-11 pr-11 h-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-11 pr-11 h-12"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Role Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
              className="w-full h-12 px-4 flex items-center justify-between bg-background border border-input rounded-lg text-left"
            >
              <span className={role ? "text-foreground" : "text-muted-foreground"}>
                {role === "user" ? "User" : role === "staff" ? "Staff" : "Select role"}
              </span>
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            </button>
            
            {showRoleDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10">
                <button
                  type="button"
                  onClick={() => { setRole("user"); setShowRoleDropdown(false) }}
                  className="w-full px-4 py-3 text-left hover:bg-muted transition-colors first:rounded-t-lg"
                >
                  <p className="font-medium text-foreground">User</p>
                  <p className="text-sm text-muted-foreground">Join queues at various locations</p>
                </button>
                <button
                  type="button"
                  onClick={() => { setRole("staff"); setShowRoleDropdown(false) }}
                  className="w-full px-4 py-3 text-left hover:bg-muted transition-colors last:rounded-b-lg border-t border-border"
                >
                  <p className="font-medium text-foreground">Staff</p>
                  <p className="text-sm text-muted-foreground">Manage queues at your assigned location</p>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4">
          <Button type="submit" className="w-full h-12 text-base font-semibold">
            Create Account
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          By registering, you agree to our Terms of Service and Privacy Policy
        </p>
      </form>

      {/* Footer */}
      <div className="p-6 text-center border-t border-border">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <button 
            onClick={() => navigateTo("login")}
            className="text-primary font-semibold hover:underline"
          >
            Login
          </button>
        </p>
      </div>
    </div>
  )
}
