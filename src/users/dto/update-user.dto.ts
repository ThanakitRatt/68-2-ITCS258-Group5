import {
  IsString,
  IsEmail,
  IsOptional,
} from 'class-validator';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    @IsEmail()
    email?: string;
}