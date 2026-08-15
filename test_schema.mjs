import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://qpxxzzvozrnfmjcygujv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweHh6enZvenJuZm1qY3lndWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzk1MzgsImV4cCI6MjEwMTk1NTUzOH0.Ro8xv6_5jIlMMBgKlXKqYOcZG5W980gRXFjWz2YZY_Q')
async function test() {
  const { data, error } = await supabase.from('funcionarios').select('*').limit(1)
  console.log(data ? Object.keys(data[0]) : error)
}
test()
