import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qpxxzzvozrnfmjcygujv.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweHh6enZvenJuZm1qY3lndWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzk1MzgsImV4cCI6MjEwMTk1NTUzOH0.Ro8xv6_5jIlMMBgKlXKqYOcZG5W980gRXFjWz2YZY_Q';

export const supabase = createClient(supabaseUrl, supabaseKey)
