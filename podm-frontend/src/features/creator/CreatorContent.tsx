import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, MoreVertical, ChevronDown, ChevronUp, Eye, Bookmark, DollarSign, UploadCloud, PlusCircle, Trash2, Edit } from 'lucide-react';

// --- Import Shared Types ---
import { Content, ContentStatus, ContentType } from '@common/types/Content';

// --- Import Reusable Components & Hooks ---
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/shared/StatusBadge';
import { useModal } from '../../hooks/useModal';
import { useOnClickOutside } from '../../hooks/useOnClickOutside';
import { formatCurrency } from '../../lib/formatters';
import * as apiClient from '../../lib/apiClient';

// --- Edit Modal Component ---
interface EditModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: Content | null;
    onSave: (contentId: string, updates: { title: string; description: string }) => Promise<void>;
}

const EditModal = ({ isOpen, onClose, content, onSave }: EditModalProps) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (content) {
            setTitle(content.title);
            setDescription(content.description || '');
        }
    }, [content]);

    if (!content) return null;

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await onSave(content._id, { title, description });
            handleClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save changes.');
            setIsLoading(false); // Keep modal open on error
        }
    };

    const handleClose = () => {
        setError(null);
        setIsLoading(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl">
            <header className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Content</h2>
            </header>
            <main className="p-6 space-y-4">
                <Input id="edit-title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea 
                        rows={6} 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)} 
                        className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    ></textarea>
                </div>
                 {error && <p className="text-sm text-red-500">{error}</p>}
            </main>
            <footer className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 bg-gray-50 dark:bg-gray-800">
                <Button variant="secondary" onClick={handleClose} disabled={isLoading}>Cancel</Button>
                <Button onClick={handleSubmit} isLoading={isLoading}>Save Changes</Button>
            </footer>
        </Modal>
    );
};

// --- Upload Modal Component ---
const UploadModal = ({ isOpen, onClose, onUploadSuccess }: { isOpen: boolean; onClose: () => void; onUploadSuccess: (newContent: Content) => void; }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<FileList | null>(null);
    const [visibility, setVisibility] = useState<Content['visibility']>('subscribers_only');
    const [price, setPrice] = useState('');
    const [isScheduled, setIsScheduled] = useState(false);
    const [publishDate, setPublishDate] = useState('');

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
        if (visibility === 'pay_per_view' && (!price || parseFloat(price) <= 0)) {
            setError('A valid price is required for Pay-Per-View content.');
            return;
        }
        if (isScheduled && !publishDate) {
            setError('Please select a date and time to schedule your post.');
            return;
        }

        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('type', 'photo'); // Keep this static for now
        formData.append('visibility', visibility);
        if (visibility === 'pay_per_view') {
            formData.append('price', (parseFloat(price) * 100).toString()); // Send price in cents
        }
        formData.append('scheduleIsScheduled', String(isScheduled));
        if (isScheduled) {
            formData.append('schedulePublishDate', new Date(publishDate).toISOString());
        }
        
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
        setVisibility('subscribers_only');
        setPrice('');
        setIsScheduled(false);
        setPublishDate('');
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
                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* --- 4. Add the new UI elements to the form --- */}
                    <Input id="title" label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My new photo set" />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A little bit about this content..." className="w-full bg-gray-100 dark:bg-gray-700 border-transparent rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500"></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Visibility</label>
                        <div className="flex space-x-4">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="visibility" value="subscribers_only" checked={visibility === 'subscribers_only'} onChange={() => setVisibility('subscribers_only')} className="form-radio text-purple-600"/>
                                <span className="text-sm">Subscribers Only</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="visibility" value="pay_per_view" checked={visibility === 'pay_per_view'} onChange={() => setVisibility('pay_per_view')} className="form-radio text-purple-600"/>
                                <span className="text-sm">Pay Per View (PPV)</span>
                            </label>
                        </div>
                    </div>
                    {visibility === 'pay_per_view' && (
                        <Input id="price" label="Price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="10.00" leftIcon={DollarSign} />
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Media Files</label>
                        <div className="relative p-6 border-2 border-dashed rounded-lg text-center transition-colors border-gray-300 dark:border-gray-600 hover:border-purple-500">
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <UploadCloud className="w-12 h-12 mx-auto text-gray-400" />
                                <p className="mt-2 text-sm text-gray-500">{files && files.length > 0 ? `${files.length} file(s) selected` : "Drag & drop or click to upload"}</p>
                            </label>
                            <input id="file-upload" type="file" multiple onChange={handleFileChange} className="sr-only" />
                        </div>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={isScheduled} onChange={(e) => setIsScheduled(e.target.checked)} className="form-checkbox text-purple-600 h-5 w-5 rounded"/>
                            <span className="text-sm font-medium">Schedule for later</span>
                        </label>
                        {isScheduled && (
                            <Input id="publishDate" type="datetime-local" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} containerClassName="mt-4" />
                        )}
                    </div>

                    {error && <p className="text-sm text-red-500 text-center pt-4">{error}</p>}
                </main>
                <footer className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3 bg-gray-50 dark:bg-gray-800">
                    <Button variant="secondary" onClick={handleClose} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} isLoading={isLoading}>
                        {isScheduled ? 'Schedule Post' : 'Post Now'}
                    </Button>
                </footer>
            </div>
        </Modal>
    );
};

// --- Table Components ---
type SortKey = 'created_at' | 'views' | 'galleryAdds' | 'tips';

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

const ContentRow = ({ item, onDelete, onEdit }: { item: Content; onDelete: (contentId: string) => void; onEdit: (contentItem: Content) => void; }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(menuRef, () => setIsMenuOpen(false));

    useEffect(() => {
        const fetchImageUrl = async () => {
            const thumbnailPath = item.files?.[0]?.thumbnailUrl;
            if (thumbnailPath) {
                try {
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
                    <img src={imageUrl || 'https://placehold.co/100x100/1F2937/FFFFFF?text=...'} alt={item.title} className="w-10 h-10 rounded-md object-cover mr-4" />
                    <span className="font-medium text-gray-800 dark:text-gray-200">{item.title}</span>
                </div>
            </td>
            <td className="px-4 py-3 text-center"><StatusBadge status={item.status} /></td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">{item.stats.views.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">{item.stats.galleryAdds.toLocaleString()}</td>
            <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400 text-center">{formatCurrency(item.stats.tips)}</td>
            <td className="px-4 py-3 text-center relative">
                <Button variant="ghost" size="sm" className="p-2 h-auto" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <MoreVertical className="w-5 h-5 text-gray-500" />
                </Button>
                {isMenuOpen && (
                    <div ref={menuRef} className="absolute right-4 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                        <ul className="py-1">
                            <li>
                                <button onClick={() => { onEdit(item); setIsMenuOpen(false); }} className="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <Edit className="w-4 h-4" />
                                    <span>Edit Details</span>
                                </button>
                            </li>
                            <li>
                                <button onClick={() => { onDelete(item._id); setIsMenuOpen(false); }} className="flex items-center space-x-3 w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete Content</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </td>
        </tr>
    );
};

// --- Main Content Page Component ---
const CreatorContentPage = () => {
    const [content, setContent] = useState<Content[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // State for filtering and sorting
    const [filter, setFilter] = useState<'All' | ContentType>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
    
    // Modal states
    const { isOpen: isUploadModalOpen, openModal: openUploadModal, closeModal: closeUploadModal } = useModal();
    const { isOpen: isEditModalOpen, openModal: openEditModal, closeModal: closeEditModal } = useModal();
    const [editingContent, setEditingContent] = useState<Content | null>(null);

    // Data fetching logic
    useEffect(() => {
        const fetchContent = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Adjust the sort key for API compatibility, especially for nested JSON fields
                let apiSortKey: string = sort.key;
                if (sort.key === 'views') apiSortKey = 'stats->>views';
                if (sort.key === 'galleryAdds') apiSortKey = 'stats->>galleryAdds';
                if (sort.key === 'tips') apiSortKey = 'stats->>tips';
                
                const response = await apiClient.getMyCreatorContent({
                    type: filter,
                    searchTerm: searchTerm,
                    sortKey: apiSortKey,
                    sortDirection: sort.direction,
                });
                setContent(response.data || []);
            } catch (err) {
                setError('Failed to load your content.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimer = setTimeout(() => {
            fetchContent();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [filter, searchTerm, sort]);
    
    // Handler Functions
    const handleUploadSuccess = (newContent: Content) => {
    // FIX: Reshape the incoming object to have the correct '_id' property
        const contentWithFrontendId = { ...newContent, _id: (newContent as any).id.toString() };
        
        // Add the correctly shaped object to the state
        setContent(prevContent => [contentWithFrontendId, ...prevContent]);
    };
    
    const handleOpenEditModal = (contentItem: Content) => {
        setEditingContent(contentItem);
        openEditModal();
    };

    const handleUpdateContent = async (contentId: string, updates: { title: string; description: string }) => {
        try {
            const response = await apiClient.updateContent(contentId, updates);
            const updatedItem = response.data;
            setContent(prev => prev.map(item => item._id === contentId ? { ...item, ...updatedItem } : item));
        } catch (error) {
            console.error("Failed to update content:", error);
            alert('Failed to save changes. Please try again.');
            throw error; // Re-throw to keep modal open
        }
    };

    const handleDeleteContent = async (contentId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this content? This action cannot be undone.')) {
            try {
                await apiClient.deleteContent(contentId);
                setContent(prev => prev.filter(item => item._id !== contentId));
            } catch (error) {
                console.error("Failed to delete content:", error);
                alert('Failed to delete content. Please try again.');
            }
        }
    };
    
    return (
        <>
            <UploadModal isOpen={isUploadModalOpen} onClose={closeUploadModal} onUploadSuccess={handleUploadSuccess} />
            <EditModal isOpen={isEditModalOpen} onClose={closeEditModal} content={editingContent} onSave={handleUpdateContent} />
            
            <div className="p-4 sm:p-6 lg:p-8">
                <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Content</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and track your posts.</p>
                    </div>
                    <Button onClick={openUploadModal} leftIcon={PlusCircle} className="mt-4 sm:mt-0">
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
                        <Input id="search-content" placeholder="Search content..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} leftIcon={Search} containerClassName="flex-grow w-full sm:w-auto" />
                    </div>

                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="p-8 text-center text-gray-500">Loading content...</div>
                        ) : error ? (
                            <div className="p-8 text-center text-red-500">{error}</div>
                        ) : (
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
                                   {content.length > 0 ? (
                                       content.map(item => (
                                           <ContentRow 
                                               key={item._id} 
                                               item={item} 
                                               onDelete={handleDeleteContent}
                                               onEdit={handleOpenEditModal}
                                           />
                                       ))
                                   ) : (
                                       <tr>
                                           <td colSpan={6} className="text-center py-12 text-gray-500">
                                               <p className="font-semibold">No content found.</p>
                                               <p className="text-sm">Try adjusting your filters or upload your first post!</p>
                                           </td>
                                       </tr>
                                   )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </Card>
            </div>
        </>
    );
};

export default CreatorContentPage;