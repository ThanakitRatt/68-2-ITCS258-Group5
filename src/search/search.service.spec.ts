import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { Bookings_status } from '@prisma/client';

const mockPrisma = {
  rooms: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  bookings: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  // ─── searchRooms ──────────────────────────────────────────────────────────

  describe('searchRooms', () => {
    it('returns paginated rooms for a keyword query', async () => {
      const rooms = [{ id: 1, name: 'Deluxe Room', price_per_night: 150 }];
      mockPrisma.rooms.findMany.mockResolvedValue(rooms);
      mockPrisma.rooms.count.mockResolvedValue(1);

      const result = await service.searchRooms({ q: 'deluxe', page: 1, limit: 10 });

      expect(result.data).toEqual(rooms);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);
    });

    it('filters by price range', async () => {
      mockPrisma.rooms.findMany.mockResolvedValue([]);
      mockPrisma.rooms.count.mockResolvedValue(0);

      await service.searchRooms({ minPrice: 100, maxPrice: 300 });

      expect(mockPrisma.rooms.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price_per_night: { gte: 100, lte: 300 },
          }),
        }),
      );
    });

    it('filters by minimum capacity', async () => {
      mockPrisma.rooms.findMany.mockResolvedValue([]);
      mockPrisma.rooms.count.mockResolvedValue(0);

      await service.searchRooms({ minCapacity: 3 });

      expect(mockPrisma.rooms.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ capacity: { gte: 3 } }),
        }),
      );
    });

    it('filters out rooms with overlapping bookings when dates provided', async () => {
      mockPrisma.rooms.findMany.mockResolvedValue([]);
      mockPrisma.rooms.count.mockResolvedValue(0);

      await service.searchRooms({
        checkIn: '2025-06-01T14:00:00.000Z',
        checkOut: '2025-06-05T12:00:00.000Z',
      });

      expect(mockPrisma.rooms.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bookings: expect.objectContaining({ none: expect.any(Object) }),
          }),
        }),
      );
    });

    it('throws 400 when only checkIn is provided without checkOut', async () => {
      await expect(
        service.searchRooms({ checkIn: '2025-06-01T14:00:00.000Z' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws 400 when checkIn is not before checkOut', async () => {
      await expect(
        service.searchRooms({
          checkIn: '2025-06-05T14:00:00.000Z',
          checkOut: '2025-06-01T12:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('calculates correct pagination meta', async () => {
      mockPrisma.rooms.findMany.mockResolvedValue([]);
      mockPrisma.rooms.count.mockResolvedValue(50);

      const result = await service.searchRooms({ page: 3, limit: 10 });

      expect(result.meta.totalPages).toBe(5);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);
    });
  });

  // ─── searchAllBookings ────────────────────────────────────────────────────

  describe('searchAllBookings', () => {
    it('returns all bookings filtered by status', async () => {
      const bookings = [{ id: 1, status: Bookings_status.PENDING }];
      mockPrisma.bookings.findMany.mockResolvedValue(bookings);
      mockPrisma.bookings.count.mockResolvedValue(1);

      const result = await service.searchAllBookings({ status: Bookings_status.PENDING });

      expect(result.data).toEqual(bookings);
      expect(mockPrisma.bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: Bookings_status.PENDING }),
        }),
      );
    });

    it('filters by roomId', async () => {
      mockPrisma.bookings.findMany.mockResolvedValue([]);
      mockPrisma.bookings.count.mockResolvedValue(0);

      await service.searchAllBookings({ roomId: 5 });

      expect(mockPrisma.bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ room_id: 5 }),
        }),
      );
    });

    it('filters by date range', async () => {
      mockPrisma.bookings.findMany.mockResolvedValue([]);
      mockPrisma.bookings.count.mockResolvedValue(0);

      await service.searchAllBookings({
        fromDate: '2025-06-01T00:00:00.000Z',
        toDate: '2025-12-31T00:00:00.000Z',
      });

      expect(mockPrisma.bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            check_in_date: {
              gte: new Date('2025-06-01T00:00:00.000Z'),
              lte: new Date('2025-12-31T00:00:00.000Z'),
            },
          }),
        }),
      );
    });
  });

  // ─── searchMyBookings ─────────────────────────────────────────────────────

  describe('searchMyBookings', () => {
    it('scopes results to the given userId', async () => {
      mockPrisma.bookings.findMany.mockResolvedValue([]);
      mockPrisma.bookings.count.mockResolvedValue(0);

      await service.searchMyBookings(42, {});

      expect(mockPrisma.bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ user_id: 42 }),
        }),
      );
    });

    it('applies status filter alongside userId scope', async () => {
      mockPrisma.bookings.findMany.mockResolvedValue([]);
      mockPrisma.bookings.count.mockResolvedValue(0);

      await service.searchMyBookings(1, { status: Bookings_status.APPROVED });

      expect(mockPrisma.bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: 1,
            status: Bookings_status.APPROVED,
          }),
        }),
      );
    });
  });
});