import React, { useState, useEffect } from 'react';
import { CheckCircle, Twitter, Instagram } from 'lucide-react';

// --- Import Shared Types ---
import { Creator } from '../../../common/types/Creator';
import { Content } from '../../../common/types/Content';

// --- Import Reusable Components ---
import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import Container from '../../components/layout/Container';
import TierCard from '../../components/shared/TierCard';
import PostCard from '../../components/shared/ContentCard'; // Assuming ContentCard is renamed to PostCard
import Button from '../../components/ui/Button';

// --- Main Profile Page Component ---
interface CreatorProfilePageProps {
    creator: Creator;
    content: Content[];
}

const CreatorProfilePage = ({ creator, content }: CreatorProfilePageProps) => {
    const [selectedTierId, setSelectedTierId] = useState(creator.creatorData.subscriptionTiers[1]?.id || creator.creatorData.subscriptionTiers[0]?.id);
    const selectedTier = creator.creatorData.subscriptionTiers.find(t => t.id === selectedTierId);

    return (
        <div className="bg-gray-50 dark:bg-gray-900 font-sans">
            <Header 
                onLoginClick={() => { /* Logic to open login modal */ }}
                onSignUpClick={() => { /* Logic to open signup modal */ }}
            />

            <main>
                <Container className="py-8">
                    {/* Profile Header */}
                    <div className="relative h-48 sm:h-64 rounded-xl overflow-hidden">
                        <img src="https://placehold.co/1200x400/1F2937/FFFFFF?text=Cover+Image" alt="Cover" className="w-full h-full object-cover" />
                    </div>
                    <div className="relative px-4 -mt-16">
                        <div className="flex flex-col sm:flex-row items-end space-y-4 sm:space-y-0 sm:space-x-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
                            <img src={creator.profile.avatar} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800" />
                            <div className="flex-grow">
                                <div className="flex items-center space-x-2">
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{creator.profile.name}</h1>
                                    <CheckCircle className="w-6 h-6 text-blue-500" />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">@{creator.username}</p>
                                <div className="flex space-x-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
                                    <span><span className="font-bold">{content.length}</span> Posts</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" className="p-2 h-auto"><Twitter className="w-5 h-5 text-gray-600 dark:text-gray-300" /></Button>
                                <Button variant="ghost" size="sm" className="p-2 h-auto"><Instagram className="w-5 h-5 text-gray-600 dark:text-gray-300" /></Button>
                                <Button variant="secondary">Message</Button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Bio Section */}
                    <div className="mt-8 bg-white dark:bg-gray-800/50 rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold mb-2">About {creator.profile.name}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{creator.profile.bio}</p>
                    </div>

                    {/* Tiers Section */}
                    <div className="mt-8">
                        <h2 className="text-xl font-bold mb-4 text-center">Choose Your Subscription</h2>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {creator.creatorData.subscriptionTiers.map(tier => (
                                <TierCard key={tier.id} tier={tier} onSelect={setSelectedTierId} isSelected={selectedTierId === tier.id} />
                            ))}
                        </div>
                        <div className="mt-6 text-center">
                            <Button size="lg" className="w-full md:w-auto md:px-12 bg-pink-500 hover:bg-pink-600">
                                Subscribe for ${selectedTier?.price}/month
                            </Button>
                        </div>
                    </div>

                    {/* Content Grid Section */}
                    <div className="mt-8">
                        <h2 className="text-xl font-bold mb-4">Content Preview</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {content.map(item => (
                                <PostCard key={item._id} post={{...item, creator: {name: creator.profile.name, avatar: creator.profile.avatar, verified: true}}} isLocked={true} />
                            ))}
                        </div>
                        <div className="text-center mt-8">
                            <Button variant="secondary">Load More</Button>
                        </div>
                    </div>
                </Container>
            </main>
            <Footer />
        </div>
    );
};

export default function App() {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [creator, setCreator] = useState<Creator | null>(null);
    const [content, setContent] = useState<Content[]>([]);

    useEffect(() => {
        const fetchPublicProfile = async () => {
            setIsLoading(true);
            // Simulate API call for a specific creator's public data
            const creatorData: Creator = {
                 _id: 'c1', username: 'creatorone', email: '', passwordHash: '', role: 'creator', status: 'active',
                 profile: { name: 'CreatorOne', avatar: 'https://placehold.co/150x150/7E22CE/FFFFFF?text=C1', bio: 'Welcome to my official page! ✨ Subscribe to unlock exclusive behind-the-scenes content, tutorials, and direct messages with me. New posts every week!' },
                 creatorData: {
                    subscriptionTiers: [
                        { id: 't1', name: 'Bronze Tier', price: 4.99, features: ['Basic content access', 'Group chat access'], subscriberCount: 0 },
                        { id: 't2', name: 'Silver Tier', price: 9.99, features: ['All content access', 'Direct Messages (DMs)'], subscriberCount: 0 },
                        { id: 't3', name: 'Gold Tier', price: 19.99, features: ['All content + DMs', '1 custom request/month'], subscriberCount: 0 },
                    ],
                 } as any, // Cast to any to avoid filling out all creatorData fields for this example
                 createdAt: '', updatedAt: ''
            };
            const contentData: Content[] = Array.from({ length: 8 }, (_, i) => ({
                _id: `p${i+1}`, creatorId: 'c1', title: `Post ${i+1}`, type: 'photo', status: 'published',
                files: [{ id: `f${i+1}`, url: '', thumbnailUrl: `https://placehold.co/400x${400 + i*20}/1F2937/FFFFFF?text=P${i+1}`, size: 0, mimeType: '' }],
            } as Content)); // Cast to satisfy all required Content fields for this example

            setCreator(creatorData);
            setContent(contentData);
            setIsLoading(false);
        };
        fetchPublicProfile();
    }, []);

    return (
        <div className={isDarkMode ? 'dark' : ''}>
            {isLoading || !creator ? (
                <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Profile...</div>
            ) : (
                <CreatorProfilePage creator={creator} content={content} />
            )}
        </div>
    );
}
