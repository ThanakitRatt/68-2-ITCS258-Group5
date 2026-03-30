import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class User {
  @IsNotEmpty()
  id!: number;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  passwordHash!: string;

  @IsNotEmpty()
  role!: User_Role;
}

export enum User_Role {
  Admin = 'Admin',
  User = 'User',
}