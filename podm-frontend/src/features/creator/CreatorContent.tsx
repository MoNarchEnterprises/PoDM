import React, { useState, useMemo, useEffect } from 'react';
import { Home, FileText, MessageSquare, BarChart2, Settings, DollarSign, PlusCircle, Search, MoreVertical, ChevronDown, ChevronUp, Eye, Bookmark, UploadCloud, X } from 'lucide-react';

// --- Import Shared Types ---
import { Content, ContentStatus, ContentType } from '@common/types/Content';

// --- Import Reusable Components & Hooks ---
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/shared/StatusBadge';
import { useModal } from '../../hooks/useModal';
import { formatCurrency } from '../../lib/formatters';
import * as apiClient from '../../lib/apiClient';

// --- Reusable Sub-Components ---

const ContentRow = ({ item }: { item: Content }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchImageUrl = async () => {
            // Check if there is a files array and if the first item has a thumbnailUrl path
            const thumbnailPath = item.files?.[0]?.thumbnailUrl;
            if (thumbnailPath) {
                try {
                    // This function should get a signed URL for a specific path.
                    // We will need to create this endpoint.
                    const response = await apiClient.getSecureContentUrl(item._id); 
                    setImageUrl(response.data.secureUrl);
                } catch (error) {
                    console.error("Failed to fetch secure thumbnail URL for", item.title, error);
                    setImageUrl('https://placehold.co/100x100/1F2937/FFFFFF?text=Error');
                }
            } else {
                setImageUrl('https://placehold.co/100x100/1F2937/FFFFFF?text=...');
            }
        };
        fetchImageUrl();
    }, [item._id, item.files]);

    return (
        <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <td className="px-4 py-3">
                <div className="flex items-center">
                    <img
                        src={imageUrl || 'https://placehold.co/100x100/1F2937/FFFFFF?text=...'}
                        alt={item.title}
                        className="w-10 h-10 rounded-md object-cover mr-4"
                    />
                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.title}</span>
                </div>
            </td>
            <td className="px-4 py-3 text-center">
                <StatusBadge status={item.status} />
            </td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">{item.stats.views.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">{item.stats.galleryAdds.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400 text-center">{formatCurrency(item.stats.tips)}</td>
            <td className="px-4 py-3 text-center">
                <Button variant="ghost" size="sm" className="p-2 h-auto">
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                </Button>
            </td>
        </tr>
    );
};


type SortKey = 'createdAt' | 'views' | 'galleryAdds' | 'tips';

const SortableHeader = ({ label, sortKey, currentSort, setSort, Icon }: { label: string; sortKey: SortKey; currentSort: { key: SortKey; direction: 'asc' | 'desc' }; setSort: (sort: { key: SortKey; direction: 'asc' | 'desc' }) => void; Icon: React.ElementType }) => {
    const isActive = currentSort.key === sortKey;
    const isAsc = currentSort.direction === 'asc';
    
    const handleClick = () => {
        if (isActive) {
            setSort({ key: sortKey, direction: isAsc ? 'desc' : 'asc' });
        } else {
            setSort({ key: sortKey, direction: 'desc' });
        }
    };

    return (
        <th onClick={handleClick} className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer text-center">
            <div className="flex items-center justify-center space-x-1">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
                {isActive && (isAsc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
            </div>
        </th>
    );
};

const UploadModal = ({ isOpen, onClose, onUploadSuccess }: { isOpen: boolean; onClose: () => void; onUploadSuccess: (newContent: Content) => void; }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<FileList | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFiles(e.target.files);
    };

    const handleSubmit = async () => {
        if (!files || files.length === 0 || !title) {
            setError('A title and at least one file are required.');
            return;
        }

        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('type', 'photo');
        formData.append('visibility', 'subscribers_only');

        for (let i = 0; i < files.length; i++) {
            formData.append('contentFiles', files[i]);
        }

        try {
            const response = await apiClient.createContent(formData);
            onUploadSuccess(response.data);
            handleClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Upload failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setTitle('');
        setDescription('');
        setFiles(null);
        setError(null);
        setIsLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} className="max-w-3xl">
            <div className="flex flex-col max-h-[90vh]">
                <header className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upload New Content</h2>
                </header>
                <main className="flex-1 overflow-y-auto p-6 space-y-4">
                    <Input id="title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My new photo set" />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A little bit about this content..." className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Media Files</label>
                        <div className="relative p-6 border-2 border-dashed rounded-lg text-center transition-colors border-gray-300 dark:border-gray-600 hover:border-purple-500">
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <UploadCloud className="w-12 h-12 mx-auto text-gray-400" />
                                <p className="mt-2 text-sm text-gray-500">
                                    {files && files.length > 0 ? `${files.length} file(s) selected` : "Drag & drop or click to upload"}
                                </p>
                            </label>
                            <input id="file-upload" type="file" multiple onChange={handleFileChange} className="sr-only" />
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </main>
                <footer className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 bg-gray-50 dark:bg-gray-800">
                    <Button variant="secondary" onClick={handleClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} isLoading={isLoading}>Post Now</Button>
                </footer>
            </div>
        </Modal>
    );
};


// --- Main Content Page Component ---
interface CreatorContentPageProps {
    initialContent: Content[];
}

const CreatorContentPage = ({ initialContent }: CreatorContentPageProps) => {
    const [content, setContent] = useState(initialContent);
    const [filter, setFilter] = useState<'All' | ContentType>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
    const { isOpen: isModalOpen, openModal, closeModal } = useModal();

    const handleUploadSuccess = (newContent: Content) => {
        setContent(prevContent => [newContent, ...prevContent]);
    };

    const filteredAndSortedContent = useMemo(() => {
        let filtered = [...content];

        if (filter !== 'All') {
            filtered = filtered.filter(item => item.type === filter);
        }

        if (searchTerm) {
            filtered = filtered.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        filtered.sort((a, b) => {
            let valA, valB;
            if(sort.key === 'createdAt') {
                valA = new Date(a.createdAt);
                valB = new Date(b.createdAt);
            } else {
                valA = a.stats[sort.key as keyof typeof a.stats];
                valB = b.stats[sort.key as keyof typeof b.stats];
            }

            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [content, filter, searchTerm, sort]);

    return (
        <>
            <UploadModal isOpen={isModalOpen} onClose={closeModal} onUploadSuccess={handleUploadSuccess} />
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Content</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and track your posts.</p>
                    </div>
                    <Button onClick={openModal} leftIcon={PlusCircle} className="mt-4 sm:mt-0">
                        Upload New Content
                    </Button>
                </header>

                <Card noPadding>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex items-center space-x-2">
                            <Button variant={filter === 'All' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('All')}>All</Button>
                            <Button variant={filter === 'photo' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('photo')}>Photos</Button>
                            <Button variant={filter === 'video' ? 'secondary' : 'ghost'} size="sm" onClick={() => setFilter('video')}>Videos</Button>
                        </div>
                        <Input
                            id="search-content"
                            placeholder="Search content..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            leftIcon={Search}
                            containerClassName="flex-grow w-full sm:w-auto"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Content</th>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Status</th>
                                    <SortableHeader label="Views" sortKey="views" currentSort={sort} setSort={setSort} Icon={Eye} />
                                    <SortableHeader label="Gallery Adds" sortKey="galleryAdds" currentSort={sort} setSort={setSort} Icon={Bookmark} />
                                    <SortableHeader label="Tips" sortKey="tips" currentSort={sort} setSort={setSort} Icon={DollarSign} />
                                    <th className="px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                               {filteredAndSortedContent.map(item => <ContentRow key={item._id} item={item} />)}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </>
    );
};

export default CreatorContentPage;