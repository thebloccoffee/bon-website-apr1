import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jgmthehikpgcjbchlmug.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnbXRoZWhpa3BnY2piY2hsbXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwOTA0NDUsImV4cCI6MjA5MDY2NjQ0NX0.3DKKVRRdyFPjbFh0u2jTXzFI1965r3UtlM5GVUSgyvw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
