import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'John Doe', description: 'User name', type: String })
    @IsNotEmpty()
    @IsString()
    name!: string

    @ApiProperty({ example: 'user@example.com', description: 'User email address', type: String })
    @IsNotEmpty()
    @IsString()
    @IsEmail()
    email!: string

    @ApiProperty({ example: 'password123', description: 'User password', type: String })
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    password!: string
}