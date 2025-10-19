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
      news: {
        Row: {
          id: string
          slug: string
          title: string
          excerpt: string | null
          content: string | null
          cover_url: string | null
          published_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          title: string
          excerpt?: string | null
          content?: string | null
          cover_url?: string | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          excerpt?: string | null
          content?: string | null
          cover_url?: string | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      punishments: {
        Row: {
          id: string
          code: string
          title: string
          description: string
          action_type: string
          duration: string
          notes: string | null
          category: string
          position: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          code: string
          title: string
          description: string
          action_type: string
          duration: string
          notes?: string | null
          category: string
          position?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          code?: string
          title?: string
          description?: string
          action_type?: string
          duration?: string
          notes?: string | null
          category?: string
          position?: number | null
          created_at?: string | null
        }
      }
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
      rules: {
        Row: {
          id: number
          category_id: number
          title: string
          description: string | null
          order: number | null
          active: boolean | null
        }
        Insert: {
          id?: number
          category_id: number
          title: string
          description?: string | null
          order?: number | null
          active?: boolean | null
        }
        Update: {
          id?: number
          category_id?: number
          title?: string
          description?: string | null
          order?: number | null
          active?: boolean | null
        }
      }
      rule_categories: {
        Row: {
          id: number
          name: string
          description: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
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
