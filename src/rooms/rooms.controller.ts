import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { SearchRoomDto } from './dto/search-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Users_Role } from '@prisma/client';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('rooms')
@ApiBearerAuth('access-token')
@SkipThrottle()
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Users_Role.Admin)
  @Post()
  @ApiOperation({ summary: 'Create a new room (Admin only)' })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Get all active rooms' })
  @ApiResponse({ status: 200, description: 'Rooms retrieved successfully' })
  findAll() {
    return this.roomsService.findAll();
  }

  @Throttle({ default: { limit: 20, ttl: 60 } })
  @UseGuards(JwtAuthGuard)
  @Get('search')
  @ApiOperation({ summary: 'Search available rooms by filters' })
  @ApiQuery({ name: 'check_in', required: false, type: String, example: '2026-04-01T14:00:00.000Z' })
  @ApiQuery({ name: 'check_out', required: false, type: String, example: '2026-04-03T12:00:00.000Z' })
  @ApiQuery({ name: 'min_capacity', required: false, type: Number, example: 2 })
  @ApiQuery({ name: 'min_price', required: false, type: Number, example: 100 })
  @ApiQuery({ name: 'max_price', required: false, type: Number, example: 300 })
  @ApiResponse({ status: 200, description: 'Search completed successfully' })
  search(@Query() dto: SearchRoomDto) {
    return this.roomsService.search(dto);
  }

  @UseInterceptors(CacheInterceptor)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get a room by ID' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Room retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findARoom(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Users_Role.Admin)
  @Patch(':id/disable')
  @ApiOperation({ summary: 'Disable a room (Admin only)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Room disabled successfully' })
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.disable(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Users_Role.Admin)
  @Patch(':id/enable')
  @ApiOperation({ summary: 'Enable a room (Admin only)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Room enabled successfully' })
  enable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.enable(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Users_Role.Admin)
  @Patch(':id')
  @ApiOperation({ summary: 'Update a room (Admin only)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Room updated successfully' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Users_Role.Admin)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room (Admin only)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Room removed successfully' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.remove(id);
  }
}