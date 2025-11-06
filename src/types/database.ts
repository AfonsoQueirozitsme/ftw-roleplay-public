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
      applications: {
        Row: {
          id: string
          email: string | null
          status: string | null
          discord_username: string | null
          discord_id: string | null
          nome: string | null
          personagem: string | null
          motivacao: string | null
          user_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          email?: string | null
          status?: string | null
          discord_username?: string | null
          discord_id?: string | null
          nome?: string | null
          personagem?: string | null
          motivacao?: string | null
          user_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          status?: string | null
          discord_username?: string | null
          discord_id?: string | null
          nome?: string | null
          personagem?: string | null
          motivacao?: string | null
          user_id?: string | null
          created_at?: string | null
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          location: string | null
          tags: string[] | null
          starts_at: string
          ends_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          location?: string | null
          tags?: string[] | null
          starts_at: string
          ends_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          location?: string | null
          tags?: string[] | null
          starts_at?: string
          ends_at?: string | null
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
      player_info_posts: {
        Row: {
          id: string
          title: string
          content: string
          tags: string[] | null
          published_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          content: string
          tags?: string[] | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string
          tags?: string[] | null
          published_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          discord_id: string | null
          discord_username: string | null
          discord_avatar: string | null
          blocked: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          discord_id?: string | null
          discord_username?: string | null
          discord_avatar?: string | null
          blocked?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          discord_id?: string | null
          discord_username?: string | null
          discord_avatar?: string | null
          blocked?: boolean | null
          created_at?: string | null
          updated_at?: string | null
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
      reports: {
        Row: {
          id: string
          title: string
          description: string | null
          status: string | null
          severity: string | null
          category: string | null
          priority: string | null
          code: string | null
          user_id: string | null
          reporter_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          status?: string | null
          severity?: string | null
          category?: string | null
          priority?: string | null
          code?: string | null
          user_id?: string | null
          reporter_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          status?: string | null
          severity?: string | null
          category?: string | null
          priority?: string | null
          code?: string | null
          user_id?: string | null
          reporter_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      report_messages: {
        Row: {
          id: string
          report_id: string
          author: string | null
          author_type: string | null
          content: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          report_id: string
          author?: string | null
          author_type?: string | null
          content?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          report_id?: string
          author?: string | null
          author_type?: string | null
          content?: string | null
          created_at?: string | null
        }
      }
      report_attachments: {
        Row: {
          id: string
          report_id: string
          file_path: string | null
          mime_type: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          report_id: string
          file_path?: string | null
          mime_type?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          report_id?: string
          file_path?: string | null
          mime_type?: string | null
          created_at?: string | null
        }
      }
      tickets: {
        Row: {
          id: string
          title: string
          content: string | null
          user_id: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          content?: string | null
          user_id?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string | null
          user_id?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      ticket_messages: {
        Row: {
          id: string
          ticket_id: string
          author: string | null
          content: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          ticket_id: string
          author?: string | null
          content?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string
          author?: string | null
          content?: string | null
          created_at?: string | null
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
