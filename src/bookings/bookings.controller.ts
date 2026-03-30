import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/users.decorator';
import { Users_Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('bookings')
@ApiBearerAuth('access-token')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  create(@GetUser() user: any, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(user.id, createBookingDto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user bookings' })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  findMyBookings(@GetUser() user: any) {
    return this.bookingsService.findMyBookings(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by ID for current user or admin' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  findOne(@Param('id', ParseIntPipe) id: number, @GetUser() user: any) {
    return this.bookingsService.findOneForUser(id, user.id, user.role);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel current user booking' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  cancelMyBooking(@Param('id', ParseIntPipe) id: number, @GetUser() user: any) {
    return this.bookingsService.cancelMyBooking(id, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles(Users_Role.Admin)
  @Get()
  @ApiOperation({ summary: 'Get all bookings (Admin only)' })
  @ApiResponse({ status: 200, description: 'All bookings retrieved successfully' })
  findAll() {
    return this.bookingsService.findAll();
  }

  @UseGuards(RolesGuard)
  @Roles(Users_Role.Admin)
  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status (Admin only)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiResponse({ status: 200, description: 'Booking status updated successfully' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingStatusDto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, updateBookingStatusDto);
  }
}