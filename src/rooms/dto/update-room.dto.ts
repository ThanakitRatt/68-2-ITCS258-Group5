import { CreateRoomDto } from './create-room.dto';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsPositive,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class UpdateRoomDto extends PartialType(CreateRoomDto) {
      @ApiProperty({ example: 'Deluxe Room', description: 'Name of the room', type: String })
      @IsString({})
      @IsNotEmpty()
      name!: string;
      
      @ApiPropertyOptional({ example: 'A spacious room with a king-size bed', description: 'Description of the room', type: String })
      @IsString({}) 
      description?: string;
    
      @ApiProperty({ example: 2, description: 'Capacity of the room', type: Number })
      @IsInt()
      @IsNotEmpty()
      capacity!: number;
    
      @ApiProperty({ example: 150.0, description: 'Price per night for the room', type: Number })
      @IsNumber({}, { message: 'price_per_night must be a number' })
      @IsPositive()
      price_per_night!: number;
    
      @ApiPropertyOptional({ example: 'https://example.com/image.jpg', description: 'URL of the room image', type: String })
      @IsString()
      @IsUrl({}, { message: 'image_url must be a valid URL' })
      image_url?: string;
}
