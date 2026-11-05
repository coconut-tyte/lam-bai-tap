// Dán URL và "anon public key" từ Supabase > Project Settings > API.
// Key này CÔNG KHAI được (an toàn nhờ RLS trong schema.sql).
// TUYỆT ĐỐI KHÔNG dán service_role key vào đây.
window.CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY",
};
