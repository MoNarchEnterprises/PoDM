import { Request, Response } from 'express';
import supabase from '../config/supabaseClient';
import * as EmailService from '../services/email.service';
import * as SupportTicketModel from '../models/supportTicket.model';
import * as ReferralModel from '../models/referral.model';

const ENCLAVE_MAX_SPOTS = 50;

/**
 * Get number of spots remaining in The Enclave
 * GET /api/v1/enclave/spots-remaining
 */
export const getSpotsRemaining = async (req: Request, res: Response) => {
    try {
        // Count accepted applications
        const { count, error } = await supabase
            .from('enclave_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted');

        if (error) {
            console.error('Error fetching spots remaining:', error);
            return res.status(500).json({ error: 'Failed to fetch spots remaining' });
        }

        const acceptedCount = count || 0;
        const spotsRemaining = Math.max(0, ENCLAVE_MAX_SPOTS - acceptedCount);

        res.json({
            spotsRemaining,
            totalSpots: ENCLAVE_MAX_SPOTS,
            acceptedCount
        });
    } catch (error) {
        console.error('Error fetching spots remaining:', error);
        res.status(500).json({ error: 'Failed to fetch spots remaining' });
    }
};

/**
 * Submit an application to The Enclave
 * POST /api/v1/enclave/applications
 */
export const submitApplication = async (req: Request, res: Response) => {
    try {
        const {
            fullName,
            email,
            phone,
            currentPlatform,
            followerCount,
            monthlyEarnings,
            contentType,
            whyJoin,
            howHeard,
            referralCode
        } = req.body;

        // Validation
        if (!fullName || !email || !currentPlatform || !followerCount || !contentType || !whyJoin || !howHeard) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!Array.isArray(currentPlatform) || currentPlatform.length === 0) {
            return res.status(400).json({ error: 'Platform must be a non-empty array' });
        }

        if (!Array.isArray(contentType) || contentType.length === 0) {
            return res.status(400).json({ error: 'Content type must be a non-empty array' });
        }

        if (whyJoin.length > 1000) {
            return res.status(400).json({ error: 'Why join response must be under 1000 characters' });
        }

        // Check if email already exists
        const { data: existingApp, error: checkError } = await supabase
            .from('enclave_applications')
            .select('id')
            .eq('email', email)
            .single();

        if (existingApp) {
            return res.status(409).json({ error: 'An application with this email already exists' });
        }

        // Check if spots are still available
        const { count, error: countError } = await supabase
            .from('enclave_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted');

        const acceptedCount = count || 0;

        if (acceptedCount >= ENCLAVE_MAX_SPOTS) {
            return res.status(400).json({ error: 'The Enclave is now full. No more applications are being accepted.' });
        }

        // Insert application
        const { data: application, error: insertError } = await supabase
            .from('enclave_applications')
            .insert({
                full_name: fullName,
                email,
                phone: phone || null,
                current_platform: currentPlatform,
                follower_count: followerCount,
                monthly_earnings: monthlyEarnings || null,
                content_type: contentType,
                why_join: whyJoin,
                how_heard: howHeard,
                referral_code: referralCode || null
            })
            .select('id, created_at')
            .single();

        if (insertError || !application) {
            console.error('Error inserting application:', insertError);
            return res.status(500).json({ error: 'Failed to submit application' });
        }

        // Track referral if code was provided
        if (referralCode) {
            try {
                await ReferralModel.trackReferralUse(referralCode, application.id);
                console.log(`Tracked referral use for code: ${referralCode}`);
            } catch (refError) {
                console.error('Error tracking referral:', refError);
                // Don't fail the application if referral tracking fails
            }
        }

        // Send confirmation email to applicant
        try {
            await EmailService.sendEmail(
                email,
                'Your Enclave Application Has Been Received',
                `Hi ${fullName},\n\nThank you for applying to The Enclave!\n\nWe've received your application and our team will review it within 24-48 hours. You'll receive an email once we've made a decision.\n\nIn the meantime, feel free to explore our platform at https://podm.app\n\nBest regards,\nThe PoDM Team`,
                `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #8B5CF6;">Application Received ✓</h2>
                    <p>Hi ${fullName},</p>
                    <p>Thank you for applying to <strong>The Enclave</strong>!</p>
                    <p>We've received your application and our team will review it within 24-48 hours. You'll receive an email once we've made a decision.</p>
                    <p>In the meantime, feel free to explore our platform at <a href="https://podm.app">podm.app</a></p>
                    <p style="margin-top: 30px;">Best regards,<br><strong>The PoDM Team</strong></p>
                </div>
                `
            );
        } catch (emailError) {
            console.error('Failed to send confirmation email:', emailError);
            // Don't fail the request if email fails
        }

        res.status(201).json({
            message: 'Application submitted successfully',
            applicationId: application.id,
            submittedAt: application.created_at
        });
    } catch (error) {
        console.error('Error submitting application:', error);
        res.status(500).json({ error: 'Failed to submit application' });
    }
};

/**
 * Get all applications (Admin only)
 * GET /api/v1/enclave/applications
 */
export const getAllApplications = async (req: Request, res: Response) => {
    try {
        const { status } = req.query;

        let query = supabase
            .from('enclave_applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status as string);
        }

        const { data: applications, error } = await query;

        if (error) {
            console.error('Error fetching applications:', error);
            return res.status(500).json({ error: 'Failed to fetch applications' });
        }

        res.json({
            applications: applications || [],
            total: applications?.length || 0
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
};

/**
 * Update application status (Admin only)
 * PATCH /api/v1/enclave/applications/:id
 */
export const updateApplicationStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, notes } = req.body;
        const adminId = (req as any).user?.id; // From auth middleware

        if (!['pending', 'accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // If accepting, check if spots are still available
        if (status === 'accepted') {
            const { count, error: countError } = await supabase
                .from('enclave_applications')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'accepted');

            const acceptedCount = count || 0;

            if (acceptedCount >= ENCLAVE_MAX_SPOTS) {
                return res.status(400).json({ error: 'Cannot accept more applications. The Enclave is full.' });
            }
        }

        const { data: application, error: updateError } = await supabase
            .from('enclave_applications')
            .update({
                status,
                notes: notes || null,
                reviewed_at: new Date().toISOString(),
                reviewed_by: adminId
            })
            .eq('id', id)
            .select()
            .single();

        if (updateError || !application) {
            console.error('Error updating application:', updateError);
            return res.status(404).json({ error: 'Application not found' });
        }

        // Send acceptance/rejection email to applicant
        try {
            if (status === 'accepted') {
                const signupLink = `${process.env.CLIENT_URL}/signup?email=${encodeURIComponent(application.email)}&enclave=true`;
                const discordInvite = process.env.DISCORD_ENCLAVE_INVITE_URL;

                // Log warning if Discord invite is not configured
                if (!discordInvite || discordInvite === 'https://discord.gg/your-invite-code') {
                    console.warn('Discord invite URL not configured. Acceptance email will not include Discord link.');
                }

                // Plain text version
                const plainTextSteps = discordInvite && discordInvite !== 'https://discord.gg/your-invite-code'
                    ? `1. Create your creator account: ${signupLink}\n2. Join The Enclave Discord community: ${discordInvite}\n3. Complete your profile setup\n4. Start connecting with your audience`
                    : `1. Create your creator account: ${signupLink}\n2. Complete your profile setup\n3. Start connecting with your audience\n\nYou'll receive a Discord invite separately.`;

                await EmailService.sendEmail(
                    application.email,
                    '🎉 Welcome to The Enclave!',
                    `Hi ${application.full_name},\n\nCongratulations! Your application to The Enclave has been accepted!\n\nYou're now part of an exclusive community of elite creators. Here's what to do next:\n\n${plainTextSteps}\n\nWe're excited to have you on board!\n\nBest regards,\nThe PoDM Team`,
                    `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px;">
                        <div style="background: white; padding: 30px; border-radius: 8px;">
                            <h1 style="color: #8B5CF6; margin-top: 0;">🎉 Welcome to The Enclave!</h1>
                            <p style="font-size: 16px; color: #333;">Hi ${application.full_name},</p>
                            <p style="font-size: 16px; color: #333;">Congratulations! Your application to <strong>The Enclave</strong> has been <span style="color: #10B981; font-weight: bold;">ACCEPTED</span>!</p>
                            <p style="font-size: 16px; color: #333;">You're now part of an exclusive community of elite creators.</p>
                            <div style="background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <h3 style="color: #8B5CF6; margin-top: 0;">Next Steps:</h3>
                                <ol style="color: #333; line-height: 1.8;">
                                    <li>Create your creator account using the button below</li>
                                    ${discordInvite && discordInvite !== 'https://discord.gg/your-invite-code' ? '<li>Join The Enclave Discord community</li>' : ''}
                                    <li>Complete your profile setup</li>
                                    <li>Start connecting with your audience</li>
                                </ol>
                            </div>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${signupLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Create Your Account</a>
                            </div>
                            ${discordInvite && discordInvite !== 'https://discord.gg/your-invite-code' ? `
                            <div style="text-align: center; margin: 20px 0;">
                                <a href="${discordInvite}" style="display: inline-block; background: #5865F2; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">💬 Join Enclave Discord</a>
                            </div>
                            ` : `
                            <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
                                <p style="margin: 0; color: #92400E; font-size: 14px;">📧 Your Discord invite will be sent separately within 24 hours.</p>
                            </div>
                            `}
                            <p style="font-size: 14px; color: #666; margin-top: 20px;">Or copy this link: <a href="${signupLink}" style="color: #8B5CF6; word-break: break-all;">${signupLink}</a></p>
                            <p style="font-size: 16px; color: #333;">We're excited to have you on board!</p>
                            <p style="margin-top: 30px; color: #666;">Best regards,<br><strong style="color: #8B5CF6;">The PoDM Team</strong></p>
                        </div>
                    </div>
                    `
                );

                // Create support ticket for admin team to provide white glove onboarding
                try {
                    await SupportTicketModel.createSupportTicket({
                        user_id: adminId, // Assign to the admin who accepted
                        subject: `🎯 Enclave Onboarding: ${application.full_name}`,
                        status: 'Open',
                        priority: 'High',
                        conversation: [{
                            senderId: 'system',
                            senderName: 'Enclave System',
                            text: `A new creator has been accepted to The Enclave and requires white glove onboarding service.

**Applicant Details:**
- **Name:** ${application.full_name}
- **Email:** ${application.email}
- **Phone:** ${application.phone || 'Not provided'}
- **Platform(s):** ${Array.isArray(application.current_platform) ? application.current_platform.join(', ') : application.current_platform}
- **Followers:** ${application.follower_count}
- **Monthly Earnings:** ${application.monthly_earnings || 'Not provided'}

**Next Steps:**
1. Reach out to the applicant within 24 hours
2. Schedule onboarding call
3. Provide personalized platform walkthrough
4. Assist with profile setup and optimization
5. Answer any questions about The Enclave benefits

**Application ID:** ${application.id}
**Accepted on:** ${new Date().toLocaleDateString()}`,
                            timestamp: new Date().toISOString()
                        }]
                    });
                    console.log(`Support ticket created for Enclave onboarding: ${application.full_name}`);
                } catch (ticketError) {
                    console.error('Failed to create onboarding support ticket:', ticketError);
                    // Don't fail the request if ticket creation fails
                }

                // Award referral bonus if application was referred
                // Note: This assumes the applicant's user account is created elsewhere
                // You may need to create the user account here or link it differently
                try {
                    // TODO: Get the newly created user ID for the applicant
                    // For now, we'll just log that we need to award the bonus
                    // The actual bonus awarding should happen when the user account is created
                    console.log(`Application ${application.id} accepted - check for referral bonus`);

                    // If you have the user ID at this point, uncomment:
                    // await ReferralModel.awardReferralBonus(application.id, newUserId);
                } catch (bonusError) {
                    console.error('Error awarding referral bonus:', bonusError);
                    // Don't fail the request if bonus awarding fails
                }
            } else if (status === 'rejected') {
                await EmailService.sendEmail(
                    application.email,
                    'Update on Your Enclave Application',
                    `Hi ${application.full_name},\n\nThank you for your interest in The Enclave.\n\nAfter careful review, we've decided not to move forward with your application at this time. This decision was based on our current capacity and the specific needs of our community.\n\nWe encourage you to continue building your creator presence, and you're welcome to reapply in the future.\n\nBest regards,\nThe PoDM Team`,
                    `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #8B5CF6;">Update on Your Application</h2>
                        <p>Hi ${application.full_name},</p>
                        <p>Thank you for your interest in <strong>The Enclave</strong>.</p>
                        <p>After careful review, we've decided not to move forward with your application at this time. This decision was based on our current capacity and the specific needs of our community.</p>
                        <p>We encourage you to continue building your creator presence, and you're welcome to reapply in the future.</p>
                        <p style="margin-top: 30px;">Best regards,<br><strong>The PoDM Team</strong></p>
                    </div>
                    `
                );
            }
        } catch (emailError) {
            console.error('Failed to send status update email:', emailError);
            // Don't fail the request if email fails
        }

        res.json({
            message: 'Application updated successfully',
            application
        });
    } catch (error) {
        console.error('Error updating application:', error);
        res.status(500).json({ error: 'Failed to update application' });
    }
};
