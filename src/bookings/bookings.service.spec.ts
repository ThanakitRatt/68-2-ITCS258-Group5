import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Bookings_status, Users_Role } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

const mockPrismaService = {
  bookings: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  rooms: {
    findUnique: jest.fn(),
  },
  notifications: {
    create: jest.fn(),
  },
};

// Future dates to avoid 'check_in_date cannot be in the past'
const FUTURE_CHECK_IN = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const FUTURE_CHECK_OUT = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Test Suite for create
  // Verifies:
  // 1. Success: Creates a booking and notification when all conditions are met.
  // 2. Failure: Throws BadRequestException for invalid dates (check_in >= check_out).
  // 3. Failure: Throws BadRequestException when check_in_date is in the past.
  // 4. Failure: Throws NotFoundException when the room does not exist.
  // 5. Failure: Throws BadRequestException when the room is inactive.
  // 6. Failure: Throws BadRequestException when the room has an overlapping booking.
  describe('create', () => {
    const dto: CreateBookingDto = {
      room_id: 1,
      check_in_date: FUTURE_CHECK_IN,
      check_out_date: FUTURE_CHECK_OUT,
    };

    const mockRoom = { id: 1, name: 'Deluxe Room', is_active: true };
    const mockBooking = {
      id: 1,
      user_id: 1,
      room_id: 1,
      status: Bookings_status.PENDING,
    };

    it('should create a booking and notification successfully', async () => {
      mockPrismaService.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrismaService.bookings.findFirst.mockResolvedValue(null);
      mockPrismaService.bookings.create.mockResolvedValue(mockBooking);
      mockPrismaService.notifications.create.mockResolvedValue({});

      const result = await service.create(1, dto);

      expect(result.message).toBe('Booking created successfully');
      expect(result.booking).toEqual(mockBooking);
      expect(prisma.bookings.create).toHaveBeenCalled();
      expect(prisma.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user_id: 1,
            booking_id: mockBooking.id,
            type: 'BOOKING_CREATED',
          }),
        }),
      );
    });

    it('should throw BadRequestException when check_in_date >= check_out_date', async () => {
      const invalidDto: CreateBookingDto = {
        room_id: 1,
        check_in_date: FUTURE_CHECK_OUT,
        check_out_date: FUTURE_CHECK_IN,
      };

      await expect(service.create(1, invalidDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(1, invalidDto)).rejects.toThrow(
        'check_in_date must be before check_out_date',
      );
    });

    it('should throw BadRequestException when check_in_date is in the past', async () => {
      const pastDto: CreateBookingDto = {
        room_id: 1,
        check_in_date: '2020-01-01T00:00:00.000Z',
        check_out_date: '2020-01-03T00:00:00.000Z',
      };

      await expect(service.create(1, pastDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(1, pastDto)).rejects.toThrow(
        'check_in_date cannot be in the past',
      );
    });

    it('should throw NotFoundException when room does not exist', async () => {
      mockPrismaService.rooms.findUnique.mockResolvedValue(null);

      await expect(service.create(1, dto)).rejects.toThrow(NotFoundException);
      await expect(service.create(1, dto)).rejects.toThrow('Room 1 not found');
    });

    it('should throw BadRequestException when room is inactive', async () => {
      mockPrismaService.rooms.findUnique.mockResolvedValue({ ...mockRoom, is_active: false });

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(1, dto)).rejects.toThrow(
        'This room is not available for booking',
      );
    });

    it('should throw BadRequestException when room has an overlapping booking', async () => {
      mockPrismaService.rooms.findUnique.mockResolvedValue(mockRoom);
      mockPrismaService.bookings.findFirst.mockResolvedValue({ id: 99 });

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
      await expect(service.create(1, dto)).rejects.toThrow(
        'This room is already booked for the selected dates',
      );
    });
  });

  // Test Suite for findMyBookings
  // Verifies that the service returns bookings for the given user, ordered by check_in_date desc.
  describe('findMyBookings', () => {
    it('should return bookings for the given user', async () => {
      const result = [{ id: 1, user_id: 1 }, { id: 2, user_id: 1 }];
      mockPrismaService.bookings.findMany.mockResolvedValue(result);

      expect(await service.findMyBookings(1)).toBe(result);
      expect(prisma.bookings.findMany).toHaveBeenCalledWith({
        where: { user_id: 1 },
        orderBy: { check_in_date: 'desc' },
      });
    });

    it('should return an empty array when user has no bookings', async () => {
      mockPrismaService.bookings.findMany.mockResolvedValue([]);

      expect(await service.findMyBookings(999)).toEqual([]);
    });
  });

  // Test Suite for findAll
  // Verifies that the service returns all bookings ordered by check_in_date desc.
  describe('findAll', () => {
    it('should return all bookings', async () => {
      const result = [{ id: 1 }, { id: 2 }];
      mockPrismaService.bookings.findMany.mockResolvedValue(result);

      expect(await service.findAll()).toBe(result);
      expect(prisma.bookings.findMany).toHaveBeenCalledWith({
        orderBy: { check_in_date: 'desc' },
      });
    });
  });

  // Test Suite for findOneForUser
  // Verifies:
  // 1. Success: Admin can view any booking.
  // 2. Success: Regular user can view their own booking.
  // 3. Failure: Throws NotFoundException when booking does not exist.
  // 4. Failure: Throws ForbiddenException when a regular user tries to view another user's booking.
  describe('findOneForUser', () => {
    const mockBooking = { id: 1, user_id: 1 };

    it('should return a booking when the requester is the owner', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);

      expect(await service.findOneForUser(1, 1, Users_Role.User)).toBe(mockBooking);
    });

    it('should return a booking when the requester is an Admin', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);

      expect(await service.findOneForUser(1, 99, Users_Role.Admin)).toBe(mockBooking);
    });

    it('should throw NotFoundException when booking is not found', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(null);

      await expect(service.findOneForUser(999, 1, Users_Role.User)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOneForUser(999, 1, Users_Role.User)).rejects.toThrow(
        'Booking 999 not found',
      );
    });

    it("should throw ForbiddenException when a user tries to view another user's booking", async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);

      await expect(service.findOneForUser(1, 99, Users_Role.User)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.findOneForUser(1, 99, Users_Role.User)).rejects.toThrow(
        'You can only view your own bookings',
      );
    });
  });

  // Test Suite for cancelMyBooking
  // Verifies:
  // 1. Success: Owner can cancel their own pending booking.
  // 2. Failure: Throws NotFoundException when booking does not exist.
  // 3. Failure: Throws ForbiddenException when a user tries to cancel another user's booking.
  // 4. Failure: Throws BadRequestException when the booking is already cancelled.
  describe('cancelMyBooking', () => {
    const mockBooking = { id: 1, user_id: 1, status: Bookings_status.PENDING };
    const mockUpdatedBooking = { ...mockBooking, status: Bookings_status.CANCELLED };

    it('should cancel a booking and create a notification', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.bookings.update.mockResolvedValue(mockUpdatedBooking);
      mockPrismaService.notifications.create.mockResolvedValue({});

      const result = await service.cancelMyBooking(1, 1);

      expect(result.message).toBe('Booking cancelled successfully');
      expect(result.booking).toEqual(mockUpdatedBooking);
      expect(prisma.bookings.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: Bookings_status.CANCELLED },
      });
      expect(prisma.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'BOOKING_CANCELLED' }),
        }),
      );
    });

    it('should throw NotFoundException when booking is not found', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(null);

      await expect(service.cancelMyBooking(999, 1)).rejects.toThrow(NotFoundException);
      await expect(service.cancelMyBooking(999, 1)).rejects.toThrow('Booking 999 not found');
    });

    it("should throw ForbiddenException when a user tries to cancel another user's booking", async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);

      await expect(service.cancelMyBooking(1, 99)).rejects.toThrow(ForbiddenException);
      await expect(service.cancelMyBooking(1, 99)).rejects.toThrow(
        'You can only cancel your own bookings',
      );
    });

    it('should throw BadRequestException when booking is already cancelled', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue({
        ...mockBooking,
        status: Bookings_status.CANCELLED,
      });

      await expect(service.cancelMyBooking(1, 1)).rejects.toThrow(BadRequestException);
      await expect(service.cancelMyBooking(1, 1)).rejects.toThrow(
        'This booking is already cancelled',
      );
    });
  });

  // Test Suite for updateStatus (Admin only)
  // Verifies:
  // 1. Success: Admin can update booking status and a notification is created.
  // 2. Failure: Throws NotFoundException when booking does not exist.
  describe('updateStatus', () => {
    const mockBooking = { id: 1, user_id: 1, status: Bookings_status.PENDING };
    const dto: UpdateBookingStatusDto = { status: Bookings_status.APPROVED };
    const mockUpdatedBooking = { ...mockBooking, status: Bookings_status.APPROVED };

    it('should update booking status and create a notification', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.bookings.update.mockResolvedValue(mockUpdatedBooking);
      mockPrismaService.notifications.create.mockResolvedValue({});

      const result = await service.updateStatus(1, dto);

      expect(result.message).toBe('Booking status updated successfully');
      expect(result.booking).toEqual(mockUpdatedBooking);
      expect(prisma.bookings.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: Bookings_status.APPROVED },
      });
      expect(prisma.notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'BOOKING_STATUS_UPDATED' }),
        }),
      );
    });

    it('should throw NotFoundException when booking is not found', async () => {
      mockPrismaService.bookings.findUnique.mockResolvedValue(null);

      await expect(service.updateStatus(999, dto)).rejects.toThrow(NotFoundException);
      await expect(service.updateStatus(999, dto)).rejects.toThrow('Booking 999 not found');
    });
  });
});