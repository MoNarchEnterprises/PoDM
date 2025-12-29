import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import AudioPlayer from '../../../components/ui/AudioPlayer';
import * as apiClient from '../../../lib/apiClient';

interface ContentViewerModalProps {
    galleryItems: any[];
    currentIndex: number | null;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
}

const ContentViewerModal = ({ galleryItems, currentIndex, onClose, onNext, onPrevious }: ContentViewerModalProps) => {
    // State for fetching media
    const [secureUrl, setSecureUrl] = useState<string | null>(null);
    const [contentType, setContentType] = useState<'photo' | 'video' | 'audio' | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for Zoom and Pan
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);

    // Refs for DOM elements
    const imageRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const startPoint = useRef({ x: 0, y: 0 });

    const contentItem = currentIndex !== null ? galleryItems[currentIndex] : null;

    const resetTransform = useCallback(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, []);

    // Effect to fetch the secure URL when the item changes
    useEffect(() => {
        resetTransform();
        setSecureUrl(null);
        setContentType(null);
        setIsLoading(true);
        setError(null);

        if (contentItem) {
            const fetchUrl = async () => {
                try {
                    const response = await apiClient.getSecureContentViewUrl(contentItem.contentId);
                    setSecureUrl(response.data.secureUrl);
                    setContentType(response.data.contentType);
                } catch (err: any) {
                    setError(err.response?.data?.message || "Could not load content.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchUrl();
        }
    }, [contentItem, resetTransform]);

    // --- EVENT HANDLERS ---

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsPanning(true);
        startPoint.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!isPanning) return;
        setPosition({
            x: e.clientX - startPoint.current.x,
            y: e.clientY - startPoint.current.y,
        });
    };

    const handleMouseUpOrLeave = () => {
        setIsPanning(false);
    };

    // --- THIS IS THE FIX (Part 1) ---
    // The wheel handler is now memoized with useCallback.
    // It correctly accepts a native `WheelEvent` because it will be called by `addEventListener`.
    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        // Use a function update to get the latest scale value without needing it as a dependency
        setScale(prevScale => {
            const newScale = prevScale - e.deltaY * zoomSpeed * 0.1;
            return Math.min(Math.max(0.5, newScale), 5);
        });
    }, []); // No dependencies needed here now

    // --- THIS IS THE FIX (Part 2) ---
    // This effect manually attaches our non-passive event listener.
    useEffect(() => {
        const node = viewportRef.current;
        if (node && contentType === 'photo') {
            node.addEventListener('wheel', handleWheel, { passive: false });
            // Cleanup function
            return () => {
                node.removeEventListener('wheel', handleWheel);
            };
        }
    }, [contentType, handleWheel]); // Effect depends on the memoized handler

    const renderMedia = () => {
        if (isLoading) {
            return <div className="flex items-center justify-center h-full"><Loader className="w-12 h-12 animate-spin text-purple-400" /></div>;
        }
        if (error) {
            return <div className="flex items-center justify-center h-full text-red-400">{error}</div>;
        }
        if (secureUrl) {
            if (contentType === 'video') {
                return (
                    <video
                        ref={imageRef as React.RefObject<HTMLVideoElement>}
                        src={secureUrl}
                        controls
                        autoPlay
                        className="max-w-full max-h-full object-contain cursor-default"
                    />
                );
            }
            if (contentType === 'audio') {
                return (
                    <div className="flex items-center justify-center h-full p-8">
                        <div className="max-w-md w-full">
                            <AudioPlayer src={secureUrl} />
                        </div>
                    </div>
                );
            }
            return (
                <img
                    ref={imageRef as React.RefObject<HTMLImageElement>}
                    src={secureUrl}
                    alt={contentItem?.content?.title || 'Gallery Content'}
                    className="max-w-full max-h-full object-contain transition-transform duration-100"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        cursor: isPanning ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    onDoubleClick={resetTransform}
                />
            );
        }
        return null;
    };

    return (
        <Modal isOpen={currentIndex !== null} onClose={onClose} className="max-w-6xl w-full h-5/6 bg-black/80 backdrop-blur-lg border border-gray-700">
            <div className="relative flex flex-col h-full">
                <header className="flex items-center justify-between p-2 text-white z-20">
                    <h3 className="font-bold text-lg">{contentItem?.content?.title}</h3>
                </header>

                {/* --- THIS IS THE FIX (Part 3) --- */}
                {/* The `onWheel` prop is now removed, preventing the type error. */}
                <main
                    ref={viewportRef}
                    className="relative flex-1 flex items-center justify-center overflow-hidden"
                >
                    {renderMedia()}
                </main>

                <div className="absolute inset-0 flex items-center justify-between p-2 pointer-events-none z-10">
                    <Button
                        variant="ghost"
                        className="bg-black/30 hover:bg-black/60 p-2 h-auto rounded-full pointer-events-auto disabled:opacity-25 disabled:cursor-not-allowed"
                        onClick={onPrevious}
                        disabled={currentIndex === 0}
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </Button>
                    <Button
                        variant="ghost"
                        className="bg-black/30 hover:bg-black/60 p-2 h-auto rounded-full pointer-events-auto disabled:opacity-25 disabled:cursor-not-allowed"
                        onClick={onNext}
                        disabled={currentIndex === null || currentIndex >= galleryItems.length - 1}
                    >
                        <ChevronRight className="w-8 h-8" />
                    </Button>
                </div>

                {contentType === 'photo' && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/40 p-1 rounded-full z-20">
                        <Button variant="ghost" className="p-2 h-auto" onClick={() => setScale(s => Math.max(0.5, s - 0.2))}>
                            <ZoomOut className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" className="p-2 h-auto" onClick={resetTransform}>
                            <RefreshCw className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" className="p-2 h-auto" onClick={() => setScale(s => Math.min(5, s + 0.2))}>
                            <ZoomIn className="w-5 h-5" />
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ContentViewerModal;