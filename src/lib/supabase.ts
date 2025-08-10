import { createClient } from '@supabase/supabase-js'

// Check if Supabase credentials are properly configured
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isSupabaseConfigured = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_url_here' && 
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  supabaseUrl.includes('supabase.co')

// Use dummy values if not configured to prevent connection errors
const finalUrl = isSupabaseConfigured ? supabaseUrl : 'https://dummy.supabase.co'
const finalKey = isSupabaseConfigured ? supabaseAnonKey : 'dummy-key'

// Log configuration status
if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase not configured. Using offline mode. To enable database features, add your Supabase credentials to .env file.')
} else {
  console.log('✅ Supabase configured successfully')
}

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: isSupabaseConfigured ? 10 : 0
    }
  }
})

// Export configuration status for use in components
export const isSupabaseAvailable = isSupabaseConfigured

export type Database = {
  public: {
    Tables: {
      chat_messages: {
        Row: {
          id: string
          user_id: string
          message: string
          sender: 'user' | 'bot'
          category: string | null
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          sender: 'user' | 'bot'
          category?: string | null
          timestamp: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          sender?: 'user' | 'bot'
          category?: string | null
          timestamp?: string
          created_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          language: string
          location: string | null
          farm_size: string | null
          primary_crops: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          language: string
          location?: string | null
          farm_size?: string | null
          primary_crops?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          language?: string
          location?: string | null
          farm_size?: string | null
          primary_crops?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      weather_alerts: {
        Row: {
          id: string
          location: string
          alert_type: string
          title: string
          message: string
          severity: 'low' | 'medium' | 'high'
          active: boolean
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          location: string
          alert_type: string
          title: string
          message: string
          severity: 'low' | 'medium' | 'high'
          active?: boolean
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          location?: string
          alert_type?: string
          title?: string
          message?: string
          severity?: 'low' | 'medium' | 'high'
          active?: boolean
          created_at?: string
          expires_at?: string
        }
      }
    }
  }
}