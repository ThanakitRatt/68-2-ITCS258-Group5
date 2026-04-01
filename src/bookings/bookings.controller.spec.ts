import { Test, TestingModule } from '@nestjs/testing';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Bookings_status, Users_Role } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

const mockBookingsService = {
  create: jest.fn(),
  findMyBookings: jest.fn(),
  findAll: jest.fn(),
  findOneForUser: jest.fn(),
  cancelMyBooking: jest.fn(),
  updateStatus: jest.fn(),
};

describe('BookingsController', () => {
  let controller: BookingsController;
  let service: BookingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        { provide: BookingsService, useValue: mockBookingsService },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
    service = module.get<BookingsService>(BookingsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // Test Suite for create
  // Verifies that the controller passes user.id from token + DTO to the service.
  describe('create', () => {
    it('should create a booking for the authenticated user', async () => {
      const mockUser = { id: 1 };
      const dto: CreateBookingDto = {
        room_id: 1,
        check_in_date: '2026-05-01T14:00:00.000Z',
        check_out_date: '2026-05-03T12:00:00.000Z',
      };
      const result = { message: 'Booking created successfully', booking: { id: 1 } };
      mockBookingsService.create.mockResolvedValue(result);

      expect(await controller.create(mockUser, dto)).toBe(result);
      expect(service.create).toHaveBeenCalledWith(mockUser.id, dto);
    });

    it('should throw BadRequestException when dates are invalid', async () => {
      const mockUser = { id: 1 };
      const dto: CreateBookingDto = {
        room_id: 1,
        check_in_date: '2020-01-01T00:00:00.000Z',
        check_out_date: '2020-01-03T00:00:00.000Z',
      };
      mockBookingsService.create.mockRejectedValue(
        new BadRequestException('check_in_date cannot be in the past'),
      );

      await expect(controller.create(mockUser, dto)).rejects.toThrow(BadRequestException);
    });
  });

  // Test Suite for findMyBookings
  // Verifies that the controller returns bookings for the authenticated user.
  describe('findMyBookings', () => {
    it('should return bookings for the authenticated user', async () => {
      const mockUser = { id: 1 };
      const result = [{ id: 1, user_id: 1 }, { id: 2, user_id: 1 }];
      mockBookingsService.findMyBookings.mockResolvedValue(result);

      expect(await controller.findMyBookings(mockUser)).toBe(result);
      expect(service.findMyBookings).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return an empty array when user has no bookings', async () => {
      const mockUser = { id: 999 };
      mockBookingsService.findMyBookings.mockResolvedValue([]);

      expect(await controller.findMyBookings(mockUser)).toEqual([]);
    });
  });

  // Test Suite for findOne
  // Verifies:
  // 1. Success: Returns the booking for the owner or admin.
  // 2. Failure: Propagates NotFoundException when booking is not found.
  // 3. Failure: Propagates ForbiddenException when a user views another user's booking.
  describe('findOne', () => {
    it('should return a booking for the authenticated user', async () => {
      const mockUser = { id: 1, role: Users_Role.User };
      const result = { id: 1, user_id: 1 };
      mockBookingsService.findOneForUser.mockResolvedValue(result);

      expect(await controller.findOne(1, mockUser)).toBe(result);
      expect(service.findOneForUser).toHaveBeenCalledWith(1, mockUser.id, mockUser.role);
    });

    it('should throw NotFoundException when booking is not found', async () => {
      const mockUser = { id: 1, role: Users_Role.User };
      mockBookingsService.findOneForUser.mockRejectedValue(
        new NotFoundException('Booking 999 not found'),
      );

      await expect(controller.findOne(999, mockUser)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user views another user's booking", async () => {
      const mockUser = { id: 99, role: Users_Role.User };
      mockBookingsService.findOneForUser.mockRejectedValue(
        new ForbiddenException('You can only view your own bookings'),
      );

      await expect(controller.findOne(1, mockUser)).rejects.toThrow(ForbiddenException);
    });
  });

  // Test Suite for cancelMyBooking
  // Verifies:
  // 1. Success: Owner can cancel their own booking.
  // 2. Failure: Propagates NotFoundException when booking is not found.
  // 3. Failure: Propagates ForbiddenException when user cancels another user's booking.
  // 4. Failure: Propagates BadRequestException when booking is already cancelled.
  describe('cancelMyBooking', () => {
    it('should cancel the booking for the authenticated user', async () => {
      const mockUser = { id: 1 };
      const result = {
        message: 'Booking cancelled successfully',
        booking: { id: 1, status: Bookings_status.CANCELLED },
      };
      mockBookingsService.cancelMyBooking.mockResolvedValue(result);

      expect(await controller.cancelMyBooking(1, mockUser)).toBe(result);
      expect(service.cancelMyBooking).toHaveBeenCalledWith(1, mockUser.id);
    });

    it('should throw NotFoundException when booking is not found', async () => {
      const mockUser = { id: 1 };
      mockBookingsService.cancelMyBooking.mockRejectedValue(
        new NotFoundException('Booking 999 not found'),
      );

      await expect(controller.cancelMyBooking(999, mockUser)).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user cancels another user's booking", async () => {
      const mockUser = { id: 99 };
      mockBookingsService.cancelMyBooking.mockRejectedValue(
        new ForbiddenException('You can only cancel your own bookings'),
      );

      await expect(controller.cancelMyBooking(1, mockUser)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when booking is already cancelled', async () => {
      const mockUser = { id: 1 };
      mockBookingsService.cancelMyBooking.mockRejectedValue(
        new BadRequestException('This booking is already cancelled'),
      );

      await expect(controller.cancelMyBooking(1, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  // Test Suite for findAll (Admin only)
  // Verifies that the controller returns all bookings.
  describe('findAll', () => {
    it('should return all bookings', async () => {
      const result = [{ id: 1 }, { id: 2 }];
      mockBookingsService.findAll.mockResolvedValue(result);

      expect(await controller.findAll()).toBe(result);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  // Test Suite for updateStatus (Admin only)
  // Verifies:
  // 1. Success: Admin can update booking status.
  // 2. Failure: Propagates NotFoundException when booking is not found.
  describe('updateStatus', () => {
    it('should update the booking status', async () => {
      const dto: UpdateBookingStatusDto = { status: Bookings_status.APPROVED };
      const result = {
        message: 'Booking status updated successfully',
        booking: { id: 1, status: Bookings_status.APPROVED },
      };
      mockBookingsService.updateStatus.mockResolvedValue(result);

      expect(await controller.updateStatus(1, dto)).toBe(result);
      expect(service.updateStatus).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when booking is not found', async () => {
      const dto: UpdateBookingStatusDto = { status: Bookings_status.APPROVED };
      mockBookingsService.updateStatus.mockRejectedValue(
        new NotFoundException('Booking 999 not found'),
      );

      await expect(controller.updateStatus(999, dto)).rejects.toThrow(NotFoundException);
    });
  });
});