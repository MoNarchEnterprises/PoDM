import * as GalleryModel from '../models/gallery.model';
import * as TransactionModel from '../models/transaction.model';
import supabase from '../config/supabaseClient';

jest.mock('../config/supabaseClient', () => ({
    __esModule: true,
    default: {
        from: jest.fn(),
        rpc: jest.fn(),
    },
}));

describe('Content & Gallery Fix Unit Tests', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GalleryModel.addItemToGallery', () => {
        it('should append item and return added: true when content is not in gallery', async () => {
            const existingGallery = {
                id: 'gal-1',
                fan_id: 'fan-123',
                content: [{ contentId: 'post-100', addedDate: '2026-01-01T00:00:00Z', isAccessible: true }],
            };

            const updatedGallery = {
                ...existingGallery,
                content: [
                    ...existingGallery.content,
                    { contentId: 'post-101', addedDate: '2026-08-01T00:00:00Z', isAccessible: true },
                ],
            };

            const selectMock = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: existingGallery, error: null }),
                }),
            });

            const updateMock = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        single: jest.fn().mockResolvedValue({ data: updatedGallery, error: null }),
                    }),
                }),
            });

            (supabase.from as jest.Mock).mockImplementation((table: string) => {
                if (table === 'galleries') {
                    return { select: selectMock, update: updateMock };
                }
                return {};
            });

            const result = await GalleryModel.addItemToGallery('fan-123', {
                contentId: 'post-101',
                addedDate: '2026-08-01T00:00:00Z',
                isAccessible: true,
            });

            expect(result.added).toBe(true);
            expect(result.gallery).toEqual(updatedGallery);
            expect(updateMock).toHaveBeenCalled();
        });

        it('should return added: false and existing gallery without update when item already exists', async () => {
            const existingGallery = {
                id: 'gal-1',
                fan_id: 'fan-123',
                content: [{ contentId: 'post-100', addedDate: '2026-01-01T00:00:00Z', isAccessible: true }],
            };

            const selectMock = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: existingGallery, error: null }),
                }),
            });

            const updateMock = jest.fn();

            (supabase.from as jest.Mock).mockImplementation((table: string) => {
                if (table === 'galleries') {
                    return { select: selectMock, update: updateMock };
                }
                return {};
            });

            const result = await GalleryModel.addItemToGallery('fan-123', {
                contentId: 'post-100',
                addedDate: '2026-08-01T00:00:00Z',
                isAccessible: true,
            });

            expect(result.added).toBe(false);
            expect(result.gallery).toEqual(existingGallery);
            expect(updateMock).not.toHaveBeenCalled();
        });
    });

    describe('TransactionModel.findSuccessfulTransactionByFanAndContent', () => {
        it('should query transactions with .in("type", ["PPV Post", "PPV Message"]) filter', async () => {
            const limitMock = jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: 'tx-1', type: 'PPV Post', status: 'Cleared' },
                    error: null,
                }),
            });
            const eqStatusMock = jest.fn().mockReturnValue({ limit: limitMock });
            const inTypeMock = jest.fn().mockReturnValue({ eq: eqStatusMock });
            const eqContentMock = jest.fn().mockReturnValue({ in: inTypeMock });
            const eqFanMock = jest.fn().mockReturnValue({ eq: eqContentMock });
            const selectMock = jest.fn().mockReturnValue({ eq: eqFanMock });

            (supabase.from as jest.Mock).mockImplementation((table: string) => {
                if (table === 'transactions') {
                    return { select: selectMock };
                }
                return {};
            });

            const result = await TransactionModel.findSuccessfulTransactionByFanAndContent('fan-1', 'post-1');

            expect(inTypeMock).toHaveBeenCalledWith('type', ['PPV Post', 'PPV Message']);
            expect(result).toEqual({ id: 'tx-1', type: 'PPV Post', status: 'Cleared' });
        });
    });

    describe('MessageService.getAttachableVaultContent', () => {
        it('should return only unlisted vault items that are not in the fan gallery', async () => {
            const { getAttachableVaultContent } = require('../services/message.service');

            const creatorId = 'creator-1';
            const fanId = 'fan-1';

            const mockUser = { id: creatorId, role: 'creator' };
            const mockConversation = { id: 1, participants: [creatorId, fanId] };
            const mockContent = [
                { id: '101', title: 'Feed Post', visibility: 'public', files: [] },
                { id: '102', title: 'Vault Item A', visibility: 'unlisted', files: [] },
                { id: '103', title: 'Vault Item B (Saved)', visibility: 'unlisted', files: [] },
            ];
            const mockGallery = {
                fan_id: fanId,
                content: [{ contentId: '103', addedDate: '2026-01-01T00:00:00Z', isAccessible: true }],
            };

            const selectProfiles = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
                }),
            });

            const selectConversations = jest.fn().mockReturnValue({
                contains: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockConversation, error: null }),
                }),
            });

            const selectContent = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: mockContent, error: null }),
                }),
            });

            const selectGalleries = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockGallery, error: null }),
                }),
            });

            const selectSubscriptions = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: null, error: null }),
                        }),
                    }),
                }),
            });

            (supabase.from as jest.Mock).mockImplementation((table: string) => {
                if (table === 'profiles') return { select: selectProfiles };
                if (table === 'conversations') return { select: selectConversations };
                if (table === 'subscriptions') return { select: selectSubscriptions };
                if (table === 'content') return { select: selectContent };
                if (table === 'galleries') return { select: selectGalleries };
                return {};
            });

            const items = await getAttachableVaultContent(creatorId, fanId);

            expect(items).toHaveLength(1);
            expect(items[0].id).toBe('102');
            expect(items[0].title).toBe('Vault Item A');
        });

        it('should allow fetching vault content for a new subscriber without an existing conversation', async () => {
            const { getAttachableVaultContent } = require('../services/message.service');

            const creatorId = 'creator-1';
            const fanId = 'new-fan-999';

            const mockUser = { id: creatorId, role: 'creator' };
            const mockSubscription = { id: 'sub-1', fan_id: fanId, creator_id: creatorId, status: 'active' };
            const mockContent = [
                { id: '201', title: 'Vault Secret', visibility: 'unlisted', files: [] },
            ];

            const selectProfiles = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
                }),
            });

            // No conversation exists yet
            const selectConversations = jest.fn().mockReturnValue({
                contains: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
            });

            // Active subscription exists
            const selectSubscriptions = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            single: jest.fn().mockResolvedValue({ data: mockSubscription, error: null }),
                        }),
                    }),
                }),
            });

            const selectContent = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    order: jest.fn().mockResolvedValue({ data: mockContent, error: null }),
                }),
            });

            const selectGalleries = jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
            });

            (supabase.from as jest.Mock).mockImplementation((table: string) => {
                if (table === 'profiles') return { select: selectProfiles };
                if (table === 'conversations') return { select: selectConversations };
                if (table === 'subscriptions') return { select: selectSubscriptions };
                if (table === 'content') return { select: selectContent };
                if (table === 'galleries') return { select: selectGalleries };
                return {};
            });

            const items = await getAttachableVaultContent(creatorId, fanId);

            expect(items).toHaveLength(1);
            expect(items[0].id).toBe('201');
            expect(items[0].title).toBe('Vault Secret');
        });
    });
});
