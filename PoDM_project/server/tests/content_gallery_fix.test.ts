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
});
