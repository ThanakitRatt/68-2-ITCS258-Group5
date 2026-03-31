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
      mockPrisma.bookings.findMany.mockResolvedValue([{ room_id: 3 }]);
      mockPrisma.rooms.findMany.mockResolvedValue([]);
      mockPrisma.rooms.count.mockResolvedValue(0);

      await service.searchRooms({
        checkIn: '2025-06-01T14:00:00.000Z',
        checkOut: '2025-06-05T12:00:00.000Z',
      });

      expect(mockPrisma.bookings.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.any(Array),
          }),
        }),
      );

      expect(mockPrisma.rooms.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: [3] },
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
  });
});
  