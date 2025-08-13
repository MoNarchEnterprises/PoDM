import React, { useState } from 'react';
import { Lock, DollarSign, Bookmark, CheckCircle } from 'lucide-react';

// --- Import Shared Types ---
import { Content } from '@common/types/Content';
import { Creator } from '@common/types/Creator';

// --- Import Reusable UI Components ---
import Button from '../ui/Button';

// --- Local Types ---
// This interface represents the shape of the data this component expects.
// Your API would be responsible for joining the creator's info with the content.
export interface ContentWithCreator extends Content {
    creator: {
        name: string;
        avatar: string;
        verified: boolean;
    }
}

// --- Main Post Card Component ---
interface PostCardProps {
    post: ContentWithCreator;
    isLocked?: boolean; // Optional prop to force a locked state, useful for public profiles
}

const PostCard = ({ post, isLocked: forceLocked }: PostCardProps) => {
    const [isBookmarked, setIsBookmarked] = useState(false);
    
    // A post is locked if forced, or if it's pay-per-view.
    const isLocked = forceLocked || post.visibility === 'pay_per_view';
    
    return (
        <div className="bg-white dark:bg-gray-800/50 rounded-xl shadow-md overflow-hidden group transition-all duration-300 ease-in-out transform hover:shadow-xl hover:-translate-y-1">
            <div className="relative">
                <img 
                    className={`w-full h-auto object-cover aspect-[4/5] ${isLocked ? 'blur-md' : ''}`} 
                    src={post.files[0]?.thumbnailUrl} 
                    alt={post.title} 
                    onError={(e) => { e.currentTarget.src='https://placehold.co/600x400/1F2937/FFFFFF?text=Error'; }} 
                />
                {isLocked && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
                        <Lock className="w-12 h-12 mb-4" />
                        <h3 className="font-bold text-lg text-center">Content Locked</h3>
                        <Button className="mt-4">
                            {post.price ? `Unlock for $${(post.price / 100).toFixed(2)}` : 'Subscribe to view'}
                        </Button>
                    </div>
                )}
                 <div className="absolute top-2 right-2 bg-black/50 text-white text-xs font-bold px-2 py-1 rounded-full capitalize">
                    {post.type}
                </div>
            </div>
            <div className="p-4">
                <div className="flex items-center mb-3">
                    <img className="w-10 h-10 rounded-full mr-3" src={post.creator.avatar} alt={post.creator.name} />
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-white flex items-center">
                            {post.creator.name}
                            {post.creator.verified && <CheckCircle className="w-4 h-4 ml-1 text-blue-500" />}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 truncate">{post.title}</p>
                <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                    <Button variant="ghost" size="sm" leftIcon={DollarSign}>
                        Tip
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsBookmarked(!isBookmarked)}
                        className={isBookmarked ? 'text-purple-500' : ''}
                        leftIcon={Bookmark}
                    >
                        {isBookmarked ? 'Saved' : 'Save'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PostCard;
