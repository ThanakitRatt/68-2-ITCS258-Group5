import { IsOptional, IsInt, IsPositive, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';
 
export class SearchRoomDto {
  // FR-27: Date range
  @IsOptional()
  @IsDateString({}, { message: 'check_in must be a valid date (YYYY-MM-DD)' })
  check_in?: string;
 
  @IsOptional()
  @IsDateString({}, { message: 'check_out must be a valid date (YYYY-MM-DD)' })
  check_out?: string;
 
  // FR-28: Capacity & basic details
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  min_capacity?: number;
 
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  max_price?: number;
 
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  min_price?: number;
}