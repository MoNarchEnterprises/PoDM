import { readFileSync } from 'fs';
import supabase from '../config/supabaseClient';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const sqlPath = 'migrations/add_default_uuid_to_content.sql';
const sql = readFileSync(sqlPath, 'utf8');

(async () => {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } else {
      console.log('Default UUID migration applied successfully.');
    }
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
})();
