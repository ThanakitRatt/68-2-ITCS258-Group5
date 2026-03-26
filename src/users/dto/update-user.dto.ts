import {
  IsString,
  IsEmail,
  IsOptional,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterDto } from '../../auth/dto/RegisterDto.dto';

export class UpdateUserDto extends PartialType(RegisterDto) {
    @ApiPropertyOptional({ example: 'John Doe', description: 'User name', type: String })
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'user@example.com', description: 'User email address', type: String })
    @IsString()
    @IsEmail()
    email?: string;
}