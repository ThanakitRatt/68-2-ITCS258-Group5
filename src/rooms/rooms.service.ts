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

import {  Injectable, NotFoundException, BadRequestException} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { SearchRoomDto } from './dto/search-room.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

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
    this.logger.log('Fetching all rooms');
    return this.prisma.rooms.findMany();
  }

  async search(dto: SearchRoomDto) {
    const { check_in, check_out, min_capacity, max_price, min_price } = dto;
 
    // Validate: check_in ตmust check_out and otherwise
    if ((check_in && !check_out) || (!check_in && check_out)) {
      throw new BadRequestException('Both check_in and check_out are required for date search');
    }
 
    // Validate: check_in before check_out
    if (check_in && check_out) {
      const inDate = new Date(check_in);
      const outDate = new Date(check_out);
      if (inDate >= outDate) {
        throw new BadRequestException('check_in must be before check_out');
      }
    }
 
    this.logger.log(`Searching rooms with filters: ${JSON.stringify(dto)}`);
 
    // FR-29: Overlap Booking 
    // Overlap Booking = existing.check_in < our.check_out AND existing.check_out > our.check_in
    let bookedRoomIds: number[] = [];
    if (check_in && check_out) {
      const inDate = new Date(check_in);
      const outDate = new Date(check_out);
 
      const overlappingBookings = await this.prisma.bookings.findMany({
        where: {
          AND: [
            { check_in_date: { lt: outDate } },   // booking start before selected check_out 
            { check_out_date: { gt: inDate } },    // booking end after selected check_in 
            { status: { in: ['PENDING', 'APPROVED', 'PAID'] } }, // Not include cancel
          ],
        },
        select: { room_id: true },
      });
 
      bookedRoomIds = overlappingBookings.map((b) => b.room_id);
      this.logger.log(`Rooms unavailable for selected dates: ${bookedRoomIds}`);
    }
 
    
    const rooms = await this.prisma.rooms.findMany({
      where: {
        is_active: true, // Show only room active
        // FR-29: Ignore rooms that have overlap booking
        ...(bookedRoomIds.length > 0 && {
          id: { notIn: bookedRoomIds },
        }),
        // FR-28: filter  capacity
        ...(min_capacity !== undefined && {
          capacity: { gte: min_capacity },
        }),
        // FR-28: filter  price range
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
    const room = await this.prisma.rooms.findUnique({ where: { id } });
      if (!room) {
        this.logger.warn(`Room ${id} not found`);
        throw new NotFoundException(`Room ${id} not found`);
      }
      return room;
  }

  async disable(id: number) {
    this.logger.log(`Disabling room id: ${id}`);
    try{
      await this.findARoom(id);
      return this.prisma.rooms.update({
        where: { id },
        data: { is_active: false }
      });
    }
    catch (error){
      this.logger.error(`Failed to disable room: ${(error as Error).message}`);
      throw error;
    }
  }
  
  async enable(id: number) {
    this.logger.log(`Enabling room id: ${id}`);
    try{
      await this.findARoom(id);
      return this.prisma.rooms.update({
        where: { id },
        data: { is_active: true }
    });
    }
    catch (error){
      this.logger.error(`Failed to enable room: ${(error as Error).message}`);
      throw error;
    }
  }

  remove(id: number) {
    return `This action removes a #${id} room`;
  }
}
