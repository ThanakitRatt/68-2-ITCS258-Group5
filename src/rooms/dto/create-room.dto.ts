import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsPositive,
  IsUrl,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsNotEmpty()
  capacity: number;

  @IsNumber({}, { message: 'price_per_night must be a number' })
  @IsPositive()
  price_per_night: number;

  @IsString()
  @IsOptional()
  @IsUrl({}, { message: 'image_url must be a valid URL' })
  image_url?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

