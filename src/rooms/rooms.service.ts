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
import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger('RoomsService');

  create(createRoomDto: CreateRoomDto) {
    this.logger.log(`Creating room: ${createRoomDto.name}`);
    return this.prisma.rooms.create({
      data: createRoomDto,
    });
  }

  findAll() {
    this.logger.log('Fetching all active rooms');
    return this.prisma.rooms.findMany({
      where: {
        is_active: true,
      },
    });
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
    this.logger.log(`Deleting room id: ${id}`);

    await this.findARoom(id);

    return this.prisma.rooms.delete({
      where: { id },
    });
  }
}