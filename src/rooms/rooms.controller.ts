import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, UseInterceptors } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Users_Role } from '@prisma/client';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Throttle } from '@nestjs/throttler';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('rooms')
@ApiBearerAuth('access-token')
@SkipThrottle() // Skip throttling for this controller, we will apply it to individual routes
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Users_Role.Admin)
  @ApiOperation({ summary: 'Create a new room' })
  @ApiResponse({
    status: 201,
    description: 'Room created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30) // Cache for 30 seconds
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiResponse({
    status: 200,
    description: 'List of rooms retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: 'Deluxe Room' },
          description: { type: 'string', example: 'A spacious room with a king-size bed' },
          capacity: { type: 'number', example: 2 },
          price_per_night: { type: 'number', example: 150.0 },
          image_url: { type: 'string', example: 'https://example.com/image.jpg' },
          is_active: { type: 'boolean', example: true },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  findAll() {
    return this.roomsService.findAll();
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a room by ID' })
  @ApiParam({ name: 'id', description: 'Room ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Room retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        name: { type: 'string', example: 'Deluxe Room' },
        description: { type: 'string', example: 'A spacious room with a king-size bed' },
        capacity: { type: 'number', example: 2 },
        price_per_night: { type: 'number', example: 150.0 },
        image_url: { type: 'string', example: 'https://example.com/image.jpg' },
        is_active: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.findARoom(id);
  }

  @Patch(':id/disable')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Users_Role.Admin)
  @ApiOperation({ summary: 'Disable a room' })
  @ApiParam({ name: 'id', description: 'Room ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Room disabled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  disable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.disable(id);
  }

  @Patch(':id/enable')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Users_Role.Admin)
  @ApiOperation({ summary: 'Enable a room' })
  @ApiParam({ name: 'id', description: 'Room ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Room enabled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  enable(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.enable(id);
  }

  @Patch(':id')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Users_Role.Admin)
  @ApiOperation({ summary: 'Update a room' })
  @ApiParam({ name: 'id', description: 'Room ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Room updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateRoomDto: UpdateRoomDto) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Users_Role.Admin)
  @ApiOperation({ summary: 'Delete a room' })
  @ApiParam({ name: 'id', description: 'Room ID', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Room deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.remove(id);
  }
}
