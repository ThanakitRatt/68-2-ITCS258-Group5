import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchRoomsDto } from './dto/search-query.dto';
import { Bookings_status, Prisma } from '@prisma/client';

@Injectable()
export class SearchService {
  private readonly logger = new Logger('SearchService');

  constructor(private readonly prisma: PrismaService) {}

  // ─── Rooms ───────────────────────────────────────────────────────────────

  async searchRooms(filters: SearchRoomsDto = {}) {
    const {
      q,
      minPrice,
      maxPrice,
      minCapacity,
      checkIn,
      checkOut,
    } = filters;

    if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
      this.logger.warn(`Invalid search query: checkIn and checkOut must be provided together`);
      throw new BadRequestException('checkIn and checkOut must be provided together');
    }

    let checkInDate: Date | undefined = undefined;
    let checkOutDate: Date | undefined = undefined;

    if (checkIn && checkOut) {
      checkInDate = new Date(checkIn);
      checkOutDate = new Date(checkOut);

      if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
        this.logger.warn(`Invalid date format for checkIn or checkOut: checkIn=${checkIn}, checkOut=${checkOut}`);
        throw new BadRequestException('Invalid checkIn/checkOut date format');
      }

      if (checkInDate >= checkOutDate) {
        this.logger.warn(`checkIn date must be before checkOut date: checkIn=${checkIn}, checkOut=${checkOut}`);
        throw new BadRequestException('checkIn must be before checkOut');
      }
    }

    const where: Prisma.RoomsWhereInput = {
      is_active: true,
    };

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price_per_night = {};
      if (minPrice !== undefined) where.price_per_night.gte = minPrice;
      if (maxPrice !== undefined) where.price_per_night.lte = maxPrice;
    }

    if (minCapacity !== undefined) {
      where.capacity = { gte: minCapacity };
    }

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
      ];
    }

    if (checkInDate && checkOutDate) {
      const overlappingBookings = await this.prisma.bookings.findMany({
        where: {
          status: {
            in: [Bookings_status.PENDING, Bookings_status.APPROVED, Bookings_status.PAID],
          },
          AND: [
            { check_in_date: { lt: checkOutDate } },
            { check_out_date: { gt: checkInDate } },
          ],
        },
        select: { room_id: true },
        distinct: ['room_id'],
      });

      const unavailableRoomIds = (overlappingBookings ?? []).map((booking) => booking.room_id);
      if (unavailableRoomIds.length > 0) {
        where.id = { notIn: unavailableRoomIds };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.rooms.findMany({
        where,
        orderBy: { price_per_night: 'asc' },
      }),
      this.prisma.rooms.count({ where }),
    ]);

    this.logger.log(`SearchRooms executed with filters: ${JSON.stringify(filters)}, found ${total} matching rooms`);

    return {data, total};
  }
}