import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/error.middleware';
import supabase from '../config/supabaseClient';
import * as EmailService from '../services/email.service';
import * as SupportTicketModel from '../models/supportTicket.model';
import * as ReferralModel from '../models/referral.model';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/response';

const ENCLAVE_MAX_SPOTS = 50;

export const getSpotsRemaining = asyncHandler(async (req: Request, res: Response) => {
    const { count, error } = await supabase
        .from('enclave_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted');

    if (error) {
        throw new AppError('Failed to fetch spots remaining', 500);
    }

    const acceptedCount = count || 0;
    const spotsRemaining = Math.max(0, ENCLAVE_MAX_SPOTS - acceptedCount);

    res.json({
        spotsRemaining,
        totalSpots: ENCLAVE_MAX_SPOTS,
        acceptedCount
    });
});

export const submitApplication = asyncHandler(async (req: Request, res: Response) => {
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

    if (!fullName || !email || !currentPlatform || !followerCount || !contentType || !whyJoin || !howHeard) {
        throw new AppError('Missing required fields', 400);
    }

    if (!Array.isArray(currentPlatform) || currentPlatform.length === 0) {
        throw new AppError('Platform must be a non-empty array', 400);
    }

    if (!Array.isArray(contentType) || contentType.length === 0) {
        throw new AppError('Content type must be a non-empty array', 400);
    }

    if (whyJoin.length > 1000) {
        throw new AppError('Why join response must be under 1000 characters', 400);
    }

    const { data: existingApp, error: checkError } = await supabase
        .from('enclave_applications')
        .select('id')
        .eq('email', email)
        .single();

    if (checkError && checkError.code !== 'PGRST116') {
        throw new AppError('Failed to check existing applications', 500);
    }

    if (existingApp) {
        throw new AppError('An application with this email already exists', 409);
    }

    const { count, error: countError } = await supabase
        .from('enclave_applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted');

    const acceptedCount = count || 0;

    if (acceptedCount >= ENCLAVE_MAX_SPOTS) {
        throw new AppError('The Enclave is now full. No more applications are being accepted.', 400);
    }

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
        throw new AppError('Failed to submit application', 500);
    }

    if (referralCode) {
        try {
            await ReferralModel.trackReferralUse(referralCode, application.id);
        } catch (refError) {
            console.error('Error tracking referral:', refError);
        }
    }

    try {
        await EmailService.sendEmail(
            email,
            'Your Enclave Application Has Been Received',
            `Hi ${fullName},\n\nThank you for applying to The Enclave!\n\nWe've received your application and our team will review it within 24-48 hours. You'll receive an email once we've made a decision.\n\nIn the meantime, feel free to explore our platform at https://podm.app\n\nBest regards,\nThe PoDM Team`,
            `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #8B5CF6;">Application Received ✓</h2>
                <p>Hi ${fullName},</p>
                <p>Thank you for applying to <strong>The Enclave</strong>!</p>
                <p>We've received your application and our team will review it within 24-48 hours. You'll receive an email once we've made a decision.</p>
                <p>In the meantime, feel free to explore our platform at <a href="https://podm.app">podm.app</a></p>
                <p style="margin-top: 30px;">Best regards,<br><strong>The PoDM Team</strong></p>
            </div>`
        );
    } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
    }

    res.status(201).json({
        message: 'Application submitted successfully',
        applicationId: application.id,
        submittedAt: application.created_at
    });
});

export const getAllApplications = asyncHandler(async (req: Request, res: Response) => {
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
        throw new AppError('Failed to fetch applications', 500);
    }

    res.json({
        applications: applications || [],
        total: applications?.length || 0
    });
});

export const updateApplicationStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    const adminId = (req as any).user?.id;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
        throw new AppError('Invalid status', 400);
    }

    if (status === 'accepted') {
        const { count, error: countError } = await supabase
            .from('enclave_applications')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'accepted');

        const acceptedCount = count || 0;

        if (acceptedCount >= ENCLAVE_MAX_SPOTS) {
            throw new AppError('Cannot accept more applications. The Enclave is full.', 400);
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
        throw new AppError('Application not found', 404);
    }

    try {
        if (status === 'accepted') {
            const signupLink = `${process.env.CLIENT_URL}/signup?email=${encodeURIComponent(application.email)}&enclave=true`;
            const discordInvite = process.env.DISCORD_ENCLAVE_INVITE_URL;

            if (!discordInvite || discordInvite === 'https://discord.gg/your-invite-code') {
                console.warn('Discord invite URL not configured. Acceptance email will not include Discord link.');
            }

            const plainTextSteps = discordInvite && discordInvite !== 'https://discord.gg/your-invite-code'
                ? `1. Create your creator account: ${signupLink}\n2. Join The Enclave Discord community: ${discordInvite}\n3. Complete your profile setup\n4. Start connecting with your audience`
                : `1. Create your creator account: ${signupLink}\n2. Complete your profile setup\n3. Start connecting with your audience\n\nYou'll receive a Discord invite separately.`;

            await EmailService.sendEmail(
                application.email,
                '🎉 Welcome to The Enclave!',
                `Hi ${application.full_name},\n\nCongratulations! Your application to The Enclave has been accepted!\n\nYou're now part of an exclusive community of elite creators. Here's what to do next:\n\n${plainTextSteps}\n\nWe're excited to have you on board!\n\nBest regards,\nThe PoDM Team`,
                `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px;">
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
                </div>`
            );

            try {
                await SupportTicketModel.createSupportTicket({
                    user_id: adminId,
                    subject: `🎯 Enclave Onboarding: ${application.full_name}`,
                    status: 'Open',
                    priority: 'High',
                    conversation: [{
                        senderId: 'system',
                        senderName: 'Enclave System',
                        text: `A new creator has been accepted to The Enclave and requires white glove onboarding service.\n\n**Applicant Details:**\n- **Name:** ${application.full_name}\n- **Email:** ${application.email}\n- **Phone:** ${application.phone || 'Not provided'}\n- **Platform(s):** ${Array.isArray(application.current_platform) ? application.current_platform.join(', ') : application.current_platform}\n- **Followers:** ${application.follower_count}\n- **Monthly Earnings:** ${application.monthly_earnings || 'Not provided'}\n\n**Next Steps:**\n1. Reach out to the applicant within 24 hours\n2. Schedule onboarding call\n3. Provide personalized platform walkthrough\n4. Assist with profile setup and optimization\n5. Answer any questions about The Enclave benefits\n\n**Application ID:** ${application.id}\n**Accepted on:** ${new Date().toLocaleDateString()}`,
                        timestamp: new Date().toISOString()
                    }]
                });
            } catch (ticketError) {
                console.error('Failed to create onboarding support ticket:', ticketError);
            }

            console.log(`Application ${application.id} accepted - check for referral bonus`);
        } else if (status === 'rejected') {
            await EmailService.sendEmail(
                application.email,
                'Update on Your Enclave Application',
                `Hi ${application.full_name},\n\nThank you for your interest in The Enclave.\n\nAfter careful review, we've decided not to move forward with your application at this time. This decision was based on our current capacity and the specific needs of our community.\n\nWe encourage you to continue building your creator presence, and you're welcome to reapply in the future.\n\nBest regards,\nThe PoDM Team`,
                `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #8B5CF6;">Update on Your Application</h2>
                    <p>Hi ${application.full_name},</p>
                    <p>Thank you for your interest in <strong>The Enclave</strong>.</p>
                    <p>After careful review, we've decided not to move forward with your application at this time. This decision was based on our current capacity and the specific needs of our community.</p>
                    <p>We encourage you to continue building your creator presence, and you're welcome to reapply in the future.</p>
                    <p style="margin-top: 30px;">Best regards,<br><strong>The PoDM Team</strong></p>
                </div>`
            );
        }
    } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
    }

    res.json({
        message: 'Application updated successfully',
        application
    });
});
