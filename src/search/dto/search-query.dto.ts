import {
  IsOptional,
  IsString,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Bookings_status } from '@prisma/client';

export class SearchRoomsDto {
  @ApiPropertyOptional({
    example: 'deluxe',
    description: 'Search by room name or description (case-insensitive)',
    type: String,
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    example: 100,
    description: 'Minimum price per night (inclusive)',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  minPrice?: number;

  @ApiPropertyOptional({
    example: 500,
    description: 'Maximum price per night (inclusive)',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  maxPrice?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Minimum room capacity (number of guests)',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  minCapacity?: number;

  @ApiPropertyOptional({
    example: '2025-06-01T14:00:00.000Z',
    description:
      'Check-in date (ISO 8601). Must be used together with checkOut. ' +
      'Filters out rooms that have an overlapping active booking.',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  checkIn?: string;

  @ApiPropertyOptional({
    example: '2025-06-05T12:00:00.000Z',
    description: 'Check-out date (ISO 8601). Must be used together with checkIn.',
    type: String,
  })
  @IsOptional()
  @IsDateString()
  checkOut?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number (1-based)',
    type: Number,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of results per page',
    type: Number,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}