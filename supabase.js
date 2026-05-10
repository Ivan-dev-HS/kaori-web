const SUPABASE_URL  = 'https://zlebihuuhgyebnauyyug.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZWJpaHV1aGd5ZWJuYXV5eXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3MjU1NDgsImV4cCI6MjA5MjMwMTU0OH0.k9HDP5e5rdQN7KP9bRPgiZZIzwsKRwtSeZE_qMpyl3I';

const { createClient } = supabase;

const db = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession:   true,
    autoRefreshToken: true,
  }
});
