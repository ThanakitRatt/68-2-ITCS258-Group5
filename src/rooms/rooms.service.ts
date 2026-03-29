/*
AI Declaration:
I used copilot to help me create the validation decorators for ValidationPipe.
I wrote all the other code, and I understand the entire implementation.

Reflection:
I understand NestJS Validation, Error Handling, and Logging.
From existing Lab4, I implemented DTO validation using class-validator decorators to make sure that body data sent to the server is valid.
I added Error Handling, so when the error occurs, it returns appropriate messages.
I also added Logging using log/warn/error to log events occurring in the service.
*/
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { SearchRoomDto } from './dto/search-room.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger('RoomsService');

  create(createRoomDto: CreateRoomDto) {
    this.logger.log(`Creating room: ${createRoomDto.name}`);
    try {
      return this.prisma.rooms.create({ data: createRoomDto });
    } catch (error) {
      this.logger.error(`Failed to create room: ${(error as Error).message}`);
      throw error;
    }
  }

  findAll() {
    this.logger.log('Fetching all active rooms');
    return this.prisma.rooms.findMany({
      where: {
        is_active: true,
      },
    });
  }

  async search(dto: SearchRoomDto) {
    const { check_in, check_out, min_capacity, max_price, min_price } = dto;

    if ((check_in && !check_out) || (!check_in && check_out)) {
      throw new BadRequestException('Both check_in and check_out are required for date search');
    }

    if (check_in && check_out) {
      const inDate = new Date(check_in);
      const outDate = new Date(check_out);

      if (inDate >= outDate) {
        throw new BadRequestException('check_in must be before check_out');
      }
    }

    this.logger.log(`Searching rooms with filters: ${JSON.stringify(dto)}`);

    let bookedRoomIds: number[] = [];

    if (check_in && check_out) {
      const inDate = new Date(check_in);
      const outDate = new Date(check_out);

      const overlappingBookings = await this.prisma.bookings.findMany({
        where: {
          AND: [
            { check_in_date: { lt: outDate } },
            { check_out_date: { gt: inDate } },
            { status: { in: ['PENDING', 'APPROVED', 'PAID'] } },
          ],
        },
        select: { room_id: true },
      });

      bookedRoomIds = overlappingBookings.map((b) => b.room_id);
      this.logger.log(`Rooms unavailable for selected dates: ${bookedRoomIds}`);
    }

    const rooms = await this.prisma.rooms.findMany({
      where: {
        is_active: true,
        ...(bookedRoomIds.length > 0 && {
          id: { notIn: bookedRoomIds },
        }),
        ...(min_capacity !== undefined && {
          capacity: { gte: min_capacity },
        }),
        ...(min_price !== undefined && {
          price_per_night: { gte: min_price },
        }),
        ...(max_price !== undefined && {
          price_per_night: { lte: max_price },
        }),
      },
    });

    this.logger.log(`Found ${rooms.length} available rooms`);
    return rooms;
  }

  async findARoom(id: number) {
    this.logger.log(`Fetching room id: ${id}`);

    const room = await this.prisma.rooms.findUnique({
      where: { id },
    });

    if (!room) {
      this.logger.warn(`Room ${id} not found`);
      throw new NotFoundException(`Room ${id} not found`);
    }

    return room;
  }

  async disable(id: number) {
    this.logger.log(`Disabling room id: ${id}`);

    await this.findARoom(id);

    return this.prisma.rooms.update({
      where: { id },
      data: { is_active: false },
    });
  }

  async enable(id: number) {
    this.logger.log(`Enabling room id: ${id}`);

    await this.findARoom(id);

    return this.prisma.rooms.update({
      where: { id },
      data: { is_active: true },
    });
  }

  async update(id: number, updateRoomDto: UpdateRoomDto) {
    this.logger.log(`Updating room id: ${id}`);

    await this.findARoom(id);

    return this.prisma.rooms.update({
      where: { id },
      data: updateRoomDto,
    });
  }

  async remove(id: number) {
    this.logger.log(`Removing room id: ${id}`);

    await this.findARoom(id);

    return this.prisma.rooms.delete({
      where: { id },
    });
  }
}