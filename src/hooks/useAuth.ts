import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, isSupabaseAvailable } from '../lib/supabase'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Skip auth if Supabase is not configured
    if (!isSupabaseAvailable) {
      setUser(null)
      setLoading(false)
      return
    }

    // Clear any existing invalid sessions
    const clearInvalidSession = async () => {
      try {
        // Clear local storage auth data
        localStorage.removeItem(`sb-${finalUrl.split('//')[1].split('.')[0]}-auth-token`)
        
        // Set initial state
        setUser(null)
        setLoading(false)
      } catch (error) {
        console.warn('Failed to clear session:', error)
        setUser(null)
        setLoading(false)
      }
    }

    clearInvalidSession()
  }, [])

  const signUp = async (email: string, password: string) => {
    if (!isSupabaseAvailable) {
      return { data: null, error: { message: 'Database not configured. Please add Supabase credentials to .env file.' } }
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseAvailable) {
      return { data: null, error: { message: 'Database not configured. Please add Supabase credentials to .env file.' } }
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    if (!isSupabaseAvailable) {
      return { error: null }
    }
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  }
}