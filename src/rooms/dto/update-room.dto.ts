import { PartialType } from '@nestjs/mapped-types';
import { CreateRoomDto } from './create-room.dto';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsPositive,
  IsUrl,
} from 'class-validator';

export class UpdateRoomDto extends PartialType(CreateRoomDto) {
      @IsString({})
      @IsNotEmpty()
      name!: string;
    
      @IsString({})
      description?: string;
    
      @IsInt()
      @IsNotEmpty()
      capacity!: number;
    
      @IsNumber({}, { message: 'price_per_night must be a number' })
      @IsPositive()
      price_per_night!: number;
    
      @IsString()
      @IsUrl({}, { message: 'image_url must be a valid URL' })
      image_url?: string;
}
