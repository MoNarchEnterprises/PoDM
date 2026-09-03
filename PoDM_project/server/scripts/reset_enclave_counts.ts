// reset_enclave_counts.ts
// Script to reset Enclave member counts and application statuses for a fresh mainnet launch.
// This will:
//   1. Set `is_enclave_member` = false for all user profiles.
//   2. Reset all Enclave application statuses to 'pending' (or delete if preferred).
//   3. Optionally, clear any cached counts in admin metrics.

import supabase from '../config/supabaseClient';
import { AppError } from '../middleware/error.middleware';

async function resetEnclaveMembers() {
  try {
    console.log('Resetting Enclave member flags on user profiles...');
    const { error: updateUserError } = await supabase
      .from('profiles')
      .update({ is_enclave_member: false })
      .neq('is_enclave_member', false);
    if (updateUserError) {
      throw new AppError(`Failed to reset user enclave flags: ${updateUserError.message}`, 500);
    }
    console.log('User enclave flags reset successfully.');

    console.log('Resetting Enclave application statuses to pending...');
    const { error: updateAppError } = await supabase
      .from('enclave_applications')
      .update({ status: 'pending' })
      .neq('status', 'pending');
    if (updateAppError) {
      throw new AppError(`Failed to reset enclave applications: ${updateAppError.message}`, 500);
    }
    console.log('Enclave applications status reset successfully.');

    console.log('Reset complete.');
  } catch (err) {
    console.error('Error during Enclave reset:', err);
    process.exit(1);
  }
}

// Execute when run directly
if (require.main === module) {
  resetEnclaveMembers();
}

export default resetEnclaveMembers;
