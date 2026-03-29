import { IsOptional, IsInt, IsPositive, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchRoomDto {
  @ApiPropertyOptional({
    example: '2026-04-01T14:00:00.000Z',
    description: 'Check-in date',
    type: String,
  })
  @IsOptional()
  @IsDateString({}, { message: 'check_in must be a valid date (YYYY-MM-DD)' })
  check_in?: string;

  @ApiPropertyOptional({
    example: '2026-04-03T12:00:00.000Z',
    description: 'Check-out date',
    type: String,
  })
  @IsOptional()
  @IsDateString({}, { message: 'check_out must be a valid date (YYYY-MM-DD)' })
  check_out?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Minimum room capacity',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  min_capacity?: number;

  @ApiPropertyOptional({
    example: 300,
    description: 'Maximum room price per night',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  max_price?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Minimum room price per night',
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  min_price?: number;
}