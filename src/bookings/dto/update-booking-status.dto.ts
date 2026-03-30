import { IsEnum, IsNotEmpty } from 'class-validator';
import { Bookings_status } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: Bookings_status,
    example: Bookings_status.APPROVED,
    description: 'Updated booking status',
  })
  @IsEnum(Bookings_status)
  @IsNotEmpty()
  status!: Bookings_status;
}