
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://dtyjrjiltezexiojuciw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0eWpyamlsdGV6ZXhpb2p1Y2l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NzgzNzAsImV4cCI6MjA1NTU1NDM3MH0.mco9V-0PPLP4KMe8ft-T_9xNjONqrEEKCSq7VttBQtw";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
