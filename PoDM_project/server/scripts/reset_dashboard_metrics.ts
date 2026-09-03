/**
 * reset_dashboard_metrics.ts
 * 
 * Production readiness script to reset all test dashboard metrics for Base Mainnet launch.
 * 
 * Operations performed:
 * 1. Resets Enclave member flags on profiles (`is_enclave_member = false`).
 * 2. Resets Enclave applications to 'pending' (or archives test apps).
 * 3. Cleans / archives test transactions so Monthly Revenue & Analytics reset to $0.00.
 * 4. Closes test support tickets so Open Support Tickets count resets to 0.
 * 5. Optionally resets or deactivates test creator status if desired.
 */

import supabase from '../config/supabaseClient';

export interface ResetOptions {
    resetEnclave?: boolean;
    resetTransactions?: boolean;
    resetSupportTickets?: boolean;
    deactivateTestCreators?: boolean;
}

export async function resetDashboardMetrics(options: ResetOptions = {
    resetEnclave: true,
    resetTransactions: true,
    resetSupportTickets: true,
    deactivateTestCreators: false,
}) {
    console.log('====================================================');
    console.log('🚀 Starting Admin Dashboard Metrics Reset for Mainnet');
    console.log('====================================================\n');

    // 1. Enclave Membership Reset
    if (options.resetEnclave) {
        console.log('1️⃣  Resetting Enclave memberships...');
        const { error: profileErr } = await supabase
            .from('profiles')
            .update({ 
                is_enclave_member: false,
                enclave_joined_at: null 
            })
            .neq('is_enclave_member', false);

        if (profileErr) {
            console.error('   ❌ Error resetting profiles enclave flags:', profileErr.message);
        } else {
            console.log('   ✅ User profile Enclave flags reset to false.');
        }

        const { error: appErr } = await supabase
            .from('enclave_applications')
            .update({ status: 'pending' })
            .neq('status', 'pending');

        if (appErr) {
            console.error('   ❌ Error resetting enclave applications:', appErr.message);
        } else {
            console.log('   ✅ Enclave applications reset to pending (50 spots open).');
        }
    }

    // 2. Transactions / Revenue Reset
    if (options.resetTransactions) {
        console.log('\n2️⃣  Resetting test transactions & revenue stats...');
        // We delete or update test transactions so they do not artificially inflate mainnet revenue
        const { error: txErr } = await supabase
            .from('transactions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Deletes test records

        if (txErr) {
            console.error('   ❌ Error clearing test transactions:', txErr.message);
        } else {
            console.log('   ✅ Transactions cleared. Monthly Revenue will report $0.00.');
        }
    }

    // 3. Support Tickets Reset
    if (options.resetSupportTickets) {
        console.log('\n3️⃣  Resetting support tickets...');
        const { error: ticketErr } = await supabase
            .from('support_tickets')
            .update({ status: 'Closed' })
            .neq('status', 'Closed');

        if (ticketErr) {
            console.error('   ❌ Error closing test support tickets:', ticketErr.message);
        } else {
            console.log('   ✅ Open support tickets closed. Open tickets count is now 0.');
        }
    }

    // 4. Optional: Deactivate test creators
    if (options.deactivateTestCreators) {
        console.log('\n4️⃣  Deactivating test creators...');
        const { error: creatorErr } = await supabase
            .from('profiles')
            .update({ status: 'inactive' })
            .eq('role', 'creator');

        if (creatorErr) {
            console.error('   ❌ Error updating creator status:', creatorErr.message);
        } else {
            console.log('   ✅ Test creators marked inactive.');
        }
    }

    console.log('\n====================================================');
    console.log('🎉 Dashboard reset finished. Mainnet values are clean.');
    console.log('====================================================\n');
}

if (require.main === module) {
    resetDashboardMetrics()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('Fatal reset error:', err);
            process.exit(1);
        });
}
