import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, UseInterceptors } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Throttle } from '@nestjs/throttler';
import { SkipThrottle } from '@nestjs/throttler';
import { skip } from 'node:test';

@SkipThrottle() // Skip throttling for this controller, we will apply it to individual routes
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30) // Cache for 30 seconds
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.roomsService.findAll();
  }

  @UseInterceptors(CacheInterceptor)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findARoom(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/disable')
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.disable(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch(':id/enable')
  enable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.enable(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.remove(id);
  }
}
