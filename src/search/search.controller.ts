import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { Throttle } from '@nestjs/throttler';

import { SearchService } from './search.service';
import { SearchRoomsDto, SearchBookingsDto } from './dto/search-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/users.decorator';
import { Users_Role } from '@prisma/client';

@ApiTags('search')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // ─── Rooms ───────────────────────────────────────────────────────────────

  @Throttle({ default: { limit: 20, ttl: 60 } })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30)
  @Get('rooms')
  @ApiOperation({
    summary: 'Search available rooms',
    description:
      'Search active rooms by keyword, price range, minimum capacity, and ' +
      'availability window. Returns paginated results ordered by price ascending. ' +
      'Results are cached for 30 seconds.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of rooms matching the search criteria',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'Deluxe Room' },
              description: { type: 'string', example: 'A spacious room with a king-size bed' },
              capacity: { type: 'number', example: 2 },
              price_per_night: { type: 'string', example: '150.00' },
              image_url: { type: 'string', example: 'https://example.com/image.jpg' },
              is_active: { type: 'boolean', example: true },
              created_at: { type: 'string', example: '2025-01-01T00:00:00.000Z' },
              updated_at: { type: 'string', example: '2025-01-01T00:00:00.000Z' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 25 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 3 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request — invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' })
  @ApiResponse({ status: 429, description: 'Too Many Requests — rate limit exceeded' })
  searchRooms(@Query() dto: SearchRoomsDto) {
    return this.searchService.searchRooms(dto);
  }

  // ─── Bookings (user-scoped) ───────────────────────────────────────────────

  @Throttle({ default: { limit: 20, ttl: 60 } })
  @Get('bookings/me')
  @ApiOperation({
    summary: "Search current user's bookings",
    description:
      "Filter and paginate the authenticated user's own bookings by status, " +
      'date range, or room.',
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list of the current user's matching bookings",
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              user_id: { type: 'number', example: 7 },
              room_id: { type: 'number', example: 3 },
              check_in_date: { type: 'string', example: '2025-06-01T14:00:00.000Z' },
              check_out_date: { type: 'string', example: '2025-06-05T12:00:00.000Z' },
              status: { type: 'string', example: 'PENDING' },
              room: { type: 'object' },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 5 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 1 },
            hasNextPage: { type: 'boolean', example: false },
            hasPreviousPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' })
  @ApiResponse({ status: 429, description: 'Too Many Requests — rate limit exceeded' })
  searchMyBookings(@GetUser() user: any, @Query() dto: SearchBookingsDto) {
    return this.searchService.searchMyBookings(user.id, dto);
  }

  // ─── Bookings (admin) ─────────────────────────────────────────────────────

  @Throttle({ default: { limit: 20, ttl: 60 } })
  @UseGuards(RolesGuard)
  @Roles(Users_Role.Admin)
  @Get('bookings')
  @ApiOperation({
    summary: 'Search all bookings (Admin only)',
    description:
      'Admin-only endpoint to filter and paginate all bookings in the system ' +
      'by status, check-in date range, or room.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of all bookings matching the search criteria',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              user_id: { type: 'number', example: 7 },
              room_id: { type: 'number', example: 3 },
              check_in_date: { type: 'string', example: '2025-06-01T14:00:00.000Z' },
              check_out_date: { type: 'string', example: '2025-06-05T12:00:00.000Z' },
              status: { type: 'string', example: 'APPROVED' },
              room: { type: 'object' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number', example: 7 },
                  name: { type: 'string', example: 'Alice' },
                  email: { type: 'string', example: 'alice@example.com' },
                  Role: { type: 'string', example: 'User' },
                },
              },
            },
          },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 10 },
            hasNextPage: { type: 'boolean', example: true },
            hasPreviousPage: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid JWT' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin role required' })
  @ApiResponse({ status: 429, description: 'Too Many Requests — rate limit exceeded' })
  searchAllBookings(@Query() dto: SearchBookingsDto) {
    return this.searchService.searchAllBookings(dto);
  }
}