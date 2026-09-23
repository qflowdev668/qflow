export type UserRole = "user" | "staff" | "admin"
export type LocationType = "clinic" | "bank" | "government" | "other"
export type QueueStatus =
  | "waiting"
  | "almost"
  | "your-turn"
  | "serving"
  | "served"
  | "cancelled"
  | "no-show"
export type QueuePriority = "emergency" | "fast-track" | "standard"
export type NotificationIcon = "queue" | "turn" | "feedback" | "info"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          email: string
          role: UserRole
          location_id: string | null
          avatar_url: string | null
          language: string
          cell_number: string | null
          sms_notifications: boolean
          notification_preferences: Record<string, boolean> | null
          created_at: string
        }
        Insert: {
          id: string
          name: string
          email: string
          role?: UserRole
          location_id?: string | null
          avatar_url?: string | null
          language?: string
          cell_number?: string | null
          sms_notifications?: boolean
          notification_preferences?: Record<string, boolean> | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: UserRole
          location_id?: string | null
          avatar_url?: string | null
          language?: string
          cell_number?: string | null
          sms_notifications?: boolean
          notification_preferences?: Record<string, boolean> | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          name: string
          type: LocationType
          address: string
          lat: number
          lng: number
          capacity: number
          is_open: boolean
          description: string | null
          queue_count: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type?: LocationType
          address: string
          lat: number
          lng: number
          capacity?: number
          is_open?: boolean
          description?: string | null
          queue_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: LocationType
          address?: string
          lat?: number
          lng?: number
          capacity?: number
          is_open?: boolean
          description?: string | null
          queue_count?: number
        }
        Relationships: []
      }
      queue_entries: {
        Row: {
          id: string
          user_id: string | null
          location_id: string
          position: number
          status: QueueStatus
          priority: QueuePriority
          priority_category: string | null
          is_walk_in: boolean
          walk_in_name: string | null
          walk_in_notes: string | null
          joined_at: string
          served_at: string | null
          serving_by: string | null
          serving_started_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          location_id: string
          position?: number
          status?: QueueStatus
          priority?: QueuePriority
          priority_category?: string | null
          is_walk_in?: boolean
          walk_in_name?: string | null
          walk_in_notes?: string | null
          joined_at?: string
          served_at?: string | null
          serving_by?: string | null
          serving_started_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          location_id?: string
          position?: number
          status?: QueueStatus
          priority?: QueuePriority
          priority_category?: string | null
          is_walk_in?: boolean
          walk_in_name?: string | null
          walk_in_notes?: string | null
          served_at?: string | null
          serving_by?: string | null
          serving_started_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          message: string
          icon: NotificationIcon
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          icon?: NotificationIcon
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          message?: string
          icon?: NotificationIcon
          read?: boolean
        }
        Relationships: []
      }
      queue_history: {
        Row: {
          id: string
          user_id: string
          location_id: string | null
          location_name: string
          status: QueueStatus
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          location_id?: string | null
          location_name: string
          status: QueueStatus
          created_at?: string
        }
        Update: {
          id?: string
          status?: QueueStatus
        }
        Relationships: []
      }
      visit_ratings: {
        Row: {
          id: string
          user_id: string
          location_id: string | null
          queue_entry_id: string | null
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          location_id?: string | null
          queue_entry_id?: string | null
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          rating?: number
          comment?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          endpoint?: string
          p256dh?: string
          auth?: string
          user_agent?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value?: string
        }
        Update: {
          value?: string
        }
        Relationships: []
      }
password_reset_tokens: {
        Row: {
          id: string
          email: string
          stage: "otp_sent" | "verified"
          expires_at: string
          consumed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          stage?: "otp_sent" | "verified"
          expires_at: string
          consumed_at?: string | null
          created_at?: string
        }
        Update: {
          stage?: "otp_sent" | "verified"
          expires_at?: string
          consumed_at?: string | null
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          id: string
          message: string
          name: string | null
          stack: string | null
          component_stack: string | null
          path: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message: string
          name?: string | null
          stack?: string | null
          component_stack?: string | null
          path?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          message?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          actor_id: string | null
          actor_name: string | null
          action: string
          detail: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_name?: string | null
          action: string
          detail?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          action?: string
          detail?: string | null
        }
        Relationships: []
      }
      admin_accounts: {
        Row: {
          id: string
          name: string
          cell_number: string
          email: string
          is_active: boolean
          last_login_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          cell_number: string
          email: string
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          cell_number?: string
          email?: string
          is_active?: boolean
          last_login_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      claim_next_queue_entry: {
        Args: { p_location_id: string }
        Returns: Database["public"]["Tables"]["queue_entries"]["Row"]
      }
      claim_queue_entry: {
        Args: { p_entry_id: string }
        Returns: Database["public"]["Tables"]["queue_entries"]["Row"]
      }
    }
    Enums: {
      user_role: UserRole
      location_type: LocationType
      queue_status: QueueStatus
      notification_icon: NotificationIcon
    }
    CompositeTypes: Record<never, never>
  }
}
