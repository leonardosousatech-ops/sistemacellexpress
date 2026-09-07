import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://qpxxzzvozrnfmjcygujv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweHh6enZvenJuZm1qY3lndWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzk1MzgsImV4cCI6MjEwMTk1NTUzOH0.Ro8xv6_5jIlMMBgKlXKqYOcZG5W980gRXFjWz2YZY_Q');
async function run() {
  const { data, error } = await supabase.rpc('admin_create_employee', {
    p_nome: 'test',
    p_email: 'test4@test.com',
    p_senha: '123',
    p_cargo: 'Test',
    p_papeis: ['balcao'],
    p_telefone: '123',
    p_ativo: true
  });
  console.log("Data:", data);
  console.log("Error:", error);
}
run();
