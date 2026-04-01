import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { Bookings_status, Users_Role } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly logger = new Logger('BookingsService');

  private validateBookingDates(checkIn: Date, checkOut: Date) {
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      this.logger.warn(`Invalid booking dates: check_in_date=${checkIn}, check_out_date=${checkOut}`);
      throw new BadRequestException('Invalid booking dates');
    }

    if (checkIn >= checkOut) {
      this.logger.warn(`check_in_date must be before check_out_date: check_in_date=${checkIn}, check_out_date=${checkOut}`);
      throw new BadRequestException('check_in_date must be before check_out_date');
    }

    const now = new Date();
    if (checkIn < now) {
      this.logger.warn(`check_in_date cannot be in the past: check_in_date=${checkIn}`);
      throw new BadRequestException('check_in_date cannot be in the past');
    }
  }

  private async ensureRoomAvailable(
    roomId: number,
    checkIn: Date,
    checkOut: Date,
    excludeBookingId?: number,
  ) {
    const overlappingBooking = await this.prisma.bookings.findFirst({
      where: {
        room_id: roomId,
        status: {
          in: [Bookings_status.PENDING, Bookings_status.APPROVED, Bookings_status.PAID],
        },
        ...(excludeBookingId && {
          id: { not: excludeBookingId },
        }),
        AND: [
          { check_in_date: { lt: checkOut } },
          { check_out_date: { gt: checkIn } },
        ],
      },
    });

    if (overlappingBooking) {
      this.logger.warn(`Room ${roomId} is already booked for the selected dates: check_in_date=${checkIn}, check_out_date=${checkOut}`);
      throw new BadRequestException('This room is already booked for the selected dates');
    }
  }

  async create(userId: number, createBookingDto: CreateBookingDto) {
    const { room_id, check_in_date, check_out_date } = createBookingDto;

    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);

    this.validateBookingDates(checkIn, checkOut);

    const room = await this.prisma.rooms.findUnique({
      where: { id: room_id },
    });

    if (!room) {
      this.logger.warn(`Room ${room_id} not found when user ${userId} attempted to create a booking`);
      throw new NotFoundException(`Room ${room_id} not found`);
    }

    if (!room.is_active) {
      this.logger.warn(`Room ${room_id} is not active when user ${userId} attempted to create a booking`);
      throw new BadRequestException('This room is not available for booking');
    }

    await this.ensureRoomAvailable(room_id, checkIn, checkOut);

    const booking = await this.prisma.bookings.create({data: 
      {
        user_id: userId,
        room_id,
        check_in_date: checkIn,
        check_out_date: checkOut,
        status: Bookings_status.PENDING,
      },
    });

    await this.prisma.notifications.create({
      data: {
        user_id: userId,
        booking_id: booking.id,
        type: 'BOOKING_CREATED',
        message: `Booking #${booking.id} was created successfully`,
      },
    });

    this.logger.log(`User ${userId} created booking ${booking.id}`);

    return {
      message: 'Booking created successfully',
      booking,
    };
  }

  async findMyBookings(userId: number) {
    this.logger.log(`Fetching bookings for user ${userId}`);
    return this.prisma.bookings.findMany({
      where: { user_id: userId },
      orderBy: {
        check_in_date: 'desc',
      },
    });
  }

  async findAll() {
    this.logger.log('Fetching all bookings');
    return this.prisma.bookings.findMany({
      orderBy: {
        check_in_date: 'desc',
      },
    });
  }

  async findOneForUser(bookingId: number, userId: number, userRole: Users_Role) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found when user ${userId} attempted to view it`);
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (userRole !== Users_Role.Admin && booking.user_id !== userId) {
      this.logger.warn(`User ${userId} attempted to view booking ${bookingId} without permission`);
      throw new ForbiddenException('You can only view your own bookings');
    }

    this.logger.log(`User ${userId} viewed booking ${bookingId}`);
    return booking;
  }

  async cancelMyBooking(bookingId: number, userId: number) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found when user ${userId} attempted to cancel it`);
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.user_id !== userId) {
      this.logger.warn(`User ${userId} attempted to cancel booking ${bookingId} without permission`);
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (booking.status === Bookings_status.CANCELLED) {
      this.logger.warn(`Booking ${bookingId} is already cancelled`);
      throw new BadRequestException('This booking is already cancelled');
    }

    const updatedBooking = await this.prisma.bookings.update({
      where: { id: bookingId },
      data: { status: Bookings_status.CANCELLED },
    });

    await this.prisma.notifications.create({
      data: {
        user_id: userId,
        booking_id: bookingId,
        type: 'BOOKING_CANCELLED',
        message: `Booking #${bookingId} was cancelled`,
      },
    });

    this.logger.log(`User ${userId} cancelled booking ${bookingId}`);
    return {
      message: 'Booking cancelled successfully',
      booking: updatedBooking,
    };
  }

  async updateStatus(bookingId: number, updateBookingStatusDto: UpdateBookingStatusDto) {
    const booking = await this.prisma.bookings.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      this.logger.warn(`Booking ${bookingId} not found when attempting to update status`);
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const updatedBooking = await this.prisma.bookings.update({
      where: { id: bookingId },
      data: {
        status: updateBookingStatusDto.status,
      },
    });

    await this.prisma.notifications.create({
      data: {
        user_id: updatedBooking.user_id,
        booking_id: updatedBooking.id,
        type: 'BOOKING_STATUS_UPDATED',
        message: `Booking #${updatedBooking.id} status changed to ${updatedBooking.status}`,
      },
    });

    this.logger.log(`Booking ${updatedBooking.id} status updated to ${updatedBooking.status}`);
    return {
      message: 'Booking status updated successfully',
      booking: updatedBooking,
    };
  }
}