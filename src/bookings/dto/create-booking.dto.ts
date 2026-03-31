import { IsInt, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 1, description: 'Room ID', type: Number })
  @IsInt()
  @IsNotEmpty()
  room_id!: number;

  @ApiProperty({ example: '2026-04-01T14:00:00.000Z', description: 'Check-in date', type: String })
  @IsDateString()
  @IsNotEmpty()
  check_in_date!: string;

  @ApiProperty({ example: '2026-04-03T12:00:00.000Z', description: 'Check-out date', type: String })
  @IsDateString()
  @IsNotEmpty()
  check_out_date!: string;
}