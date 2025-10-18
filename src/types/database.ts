export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      permissions: {
        Row: {
          id: number
          name: string
          identifier: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          identifier: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          identifier?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: number
          name: string
          identifier: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          identifier: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          identifier?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      role_permissions: {
        Row: {
          role_id: number
          permission_id: number
          created_at: string
        }
        Insert: {
          role_id: number
          permission_id: number
          created_at?: string
        }
        Update: {
          role_id?: number
          permission_id?: number
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role_id: number
          created_at: string
        }
        Insert: {
          user_id: string
          role_id: number
          created_at?: string
        }
        Update: {
          user_id?: string
          role_id?: number
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}