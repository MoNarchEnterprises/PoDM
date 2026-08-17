import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
import supabase from '../config/supabaseClient';
import { UserRole } from '../../common/types/User';

const seedUsers = [
    {
        email: 'admin@example.com',
        password: 'password123',
        username: 'admin',
        role: 'admin' as UserRole,
        name: 'Admin User',
    },
    {
        email: 'creator@example.com',
        password: 'password123',
        username: 'creator',
        role: 'creator' as UserRole,
        name: 'Jane Creator',
    },
    {
        email: 'fan@example.com',
        password: 'password123',
        username: 'fan',
        role: 'fan' as UserRole,
        name: 'John Fan',
    },
];

const seed = async () => {
    console.log('Starting seed process...');

    for (const user of seedUsers) {
        console.log(`Processing user: ${user.email}`);

        // 1. Check if user exists in Auth
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error('Error listing users:', listError);
            continue;
        }

        let authUser = users.find((u: any) => u.email === user.email);

        if (!authUser) {
            console.log(`Creating auth user for ${user.email}...`);
            const { data, error: createError } = await supabase.auth.admin.createUser({
                email: user.email,
                password: user.password,
                email_confirm: true,
                user_metadata: { username: user.username },
            });

            if (createError) {
                console.error(`Error creating user ${user.email}:`, createError);
                continue;
            }
            authUser = data.user;
        } else {
            console.log(`User ${user.email} already exists.`);
        }

        if (!authUser) continue;

        // 2. Check/Create Profile
        // We assume a trigger might create it, but we'll upsert to be sure and set the role
        console.log(`Updating profile for ${user.username}...`);

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: authUser.id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: 'active',
                full_name: user.name,
                onboarding_complete: user.role === 'creator' ? true : null, // Set onboarding complete for creators
                creator_data: user.role === 'creator' ? {
                    subscriptionTiers: [
                        {
                            id: 'tier-1',
                            name: 'Bronze',
                            price: 500,
                            description: 'Basic access',
                            features: ['Access to feed'],
                            priceId: 'price_fake_1'
                        }
                    ]
                } : null,
            })
            .select()
            .single();

        if (profileError) {
            console.error(`Error updating profile for ${user.username}:`, profileError);
        } else {
            console.log(`Profile updated for ${user.username}`);
        }

        // 3. Create Content for Creator
        if (user.role === 'creator') {
            console.log(`Creating content for ${user.username}...`);
            const contentItems = [
                {
                    creator_id: authUser.id,
                    title: 'Welcome to my page!',
                    description: 'Thanks for subscribing.',
                    type: 'photo',
                    visibility: 'subscribers_only',
                    status: 'published',
                    price: 0,
                    files: [{ url: 'https://placehold.co/600x400', type: 'image/png' }]
                },
                {
                    creator_id: authUser.id,
                    title: 'Exclusive Video',
                    description: 'Pay to view this special video.',
                    type: 'video',
                    visibility: 'pay_per_view',
                    status: 'published',
                    price: 500, // $5.00
                    files: [{ url: 'https://www.w3schools.com/html/mov_bbb.mp4', type: 'video/mp4' }]
                }
            ];

            for (const item of contentItems) {
                const { error: contentError } = await supabase
                    .from('content')
                    .insert({ ...item, id: uuidv4() });

                if (contentError) {
                    console.error('Error creating content:', contentError);
                }
            }
            console.log(`Content created for ${user.username}`);
        }
    }

    console.log('Seed process completed.');
};

seed().catch(console.error);
