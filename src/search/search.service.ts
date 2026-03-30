import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchRoomsDto, SearchBookingsDto } from './dto/search-query.dto';
import { Bookings_status, Prisma } from '@prisma/client';

@Injectable()
export class SearchService {
  private readonly logger = new Logger('SearchService');

  constructor(private readonly prisma: PrismaService) {}

  // ─── Rooms ───────────────────────────────────────────────────────────────

  async searchRooms(dto: SearchRoomsDto) {
    const {
      q,
      minPrice,
      maxPrice,
      minCapacity,
      checkIn,
      checkOut,
      page = 1,
      limit = 10,
    } = dto;

    // Validate availability window
    let checkInDate: Date | undefined;
    let checkOutDate: Date | undefined;

    if (checkIn || checkOut) {
      if (!checkIn || !checkOut) {
        throw new BadRequestException(
          'Both checkIn and checkOut must be provided together',
        );
      }
      checkInDate = new Date(checkIn);
      checkOutDate = new Date(checkOut);

      if (checkInDate >= checkOutDate) {
        throw new BadRequestException('checkIn must be before checkOut');
      }
    }

    this.logger.log(
      `Searching rooms — q="${q ?? ''}" price=[${minPrice ?? '*'},${maxPrice ?? '*'}] ` +
        `capacity>=${minCapacity ?? 0} checkIn=${checkIn ?? 'any'} page=${page}`,
    );

    const [rooms, total] = await Promise.all([
      this.prisma.rooms.findMany({
        where: {
          is_active: true,
          // Keyword search
          ...(q && {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
            ],
          }),
          // Price range
          ...(minPrice !== undefined || maxPrice !== undefined
            ? {
                price_per_night: {
                  ...(minPrice !== undefined && { gte: minPrice }),
                  ...(maxPrice !== undefined && { lte: maxPrice }),
                },
              }
            : {}),
          // Minimum capacity
          ...(minCapacity !== undefined && { capacity: { gte: minCapacity } }),
          // Availability — exclude rooms with overlapping active bookings
          ...(checkInDate && checkOutDate
            ? {
                bookings: {
                  none: {
                    status: {
                      in: [
                        Bookings_status.PENDING,
                        Bookings_status.APPROVED,
                        Bookings_status.PAID,
                      ],
                    },
                    AND: [
                      { check_in_date: { lt: checkOutDate } },
                      { check_out_date: { gt: checkInDate } },
                    ],
                  },
                },
              }
            : {}),
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { price_per_night: 'asc' },
      }),
      this.prisma.rooms.count({
        where: {
          is_active: true,
          ...(q && {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
            ],
          }),
          ...(minPrice !== undefined || maxPrice !== undefined
            ? {
                price_per_night: {
                  ...(minPrice !== undefined && { gte: minPrice }),
                  ...(maxPrice !== undefined && { lte: maxPrice }),
                },
              }
            : {}),
          ...(minCapacity !== undefined && { capacity: { gte: minCapacity } }),
          ...(checkInDate && checkOutDate
            ? {
                bookings: {
                  none: {
                    status: {
                      in: [
                        Bookings_status.PENDING,
                        Bookings_status.APPROVED,
                        Bookings_status.PAID,
                      ],
                    },
                    AND: [
                      { check_in_date: { lt: checkOutDate } },
                      { check_out_date: { gt: checkInDate } },
                    ],
                  },
                },
              }
            : {}),
        },
      }),
    ]);

    return this.paginate(rooms, total, page, limit);
  }

  // ─── Bookings (admin) ─────────────────────────────────────────────────────

  async searchAllBookings(dto: SearchBookingsDto) {
    const { status, fromDate, toDate, roomId, page = 1, limit = 10 } = dto;

    this.logger.log(
      `[Admin] Searching all bookings — status=${status ?? 'any'} room=${roomId ?? 'any'} page=${page}`,
    );

    const where: Prisma.BookingsWhereInput = {
      ...(status && { status }),
      ...(roomId && { room_id: roomId }),
      ...(fromDate || toDate
        ? {
            check_in_date: {
              ...(fromDate && { gte: new Date(fromDate) }),
              ...(toDate && { lte: new Date(toDate) }),
            },
          }
        : {}),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.bookings.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { check_in_date: 'desc' },
        include: {
          room: true,
          user: {
            select: { id: true, name: true, email: true, Role: true },
          },
        },
      }),
      this.prisma.bookings.count({ where }),
    ]);

    return this.paginate(bookings, total, page, limit);
  }

  // ─── Bookings (user-scoped) ───────────────────────────────────────────────

  async searchMyBookings(userId: number, dto: SearchBookingsDto) {
    const { status, fromDate, toDate, roomId, page = 1, limit = 10 } = dto;

    this.logger.log(
      `Searching bookings for user ${userId} — status=${status ?? 'any'} room=${roomId ?? 'any'} page=${page}`,
    );

    const where: Prisma.BookingsWhereInput = {
      user_id: userId,
      ...(status && { status }),
      ...(roomId && { room_id: roomId }),
      ...(fromDate || toDate
        ? {
            check_in_date: {
              ...(fromDate && { gte: new Date(fromDate) }),
              ...(toDate && { lte: new Date(toDate) }),
            },
          }
        : {}),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.bookings.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { check_in_date: 'desc' },
        include: { room: true },
      }),
      this.prisma.bookings.count({ where }),
    ]);

    return this.paginate(bookings, total, page, limit);
  }

  // ─── Helper: แบ่งหน้า ────────────────────────────────────────────────────

  private paginate<T>(data: T[], total: number, page: number, limit: number) {
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }
}