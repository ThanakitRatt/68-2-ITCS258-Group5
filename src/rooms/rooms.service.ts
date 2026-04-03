import { Injectable, NotFoundException} from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
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

  async update(id: number, updateRoomDto: UpdateRoomDto) {
    this.logger.log(`Updating room id: ${id}`);
    try{
      await this.findARoom(id);
      return this.prisma.rooms.update({
        where: { id },
        data: updateRoomDto
    });
    }
    catch (error){
      this.logger.error(`Failed to update room: ${(error as Error).message}`);
      throw error;
    }
  }

  async remove(id: number) {
    this.logger.log(`Deleting room id: ${id}`);
    try {
      await this.findARoom(id);
      return this.prisma.rooms.delete({ where: { id } });
    } catch (error) {
      this.logger.error(`Failed to delete room: ${(error as Error).message}`);
      throw error;
    }
  }
}
