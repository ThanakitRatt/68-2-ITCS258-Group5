/*
AI Declaration:
I used Copilot to help debug the module import issues.
I wrote all the other code, and I understand the entire implementation.

Reflection:
I understand authentication and authorization in NestJS, as well as how to use JWT for guarding the endpoints.
From lab5, I added register and login endpoints and logic using JWT.
Now, to access the rooms endpoints, the user must be authenticated and provide a valid JWT token in the Authorization header.
*/


import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/RegisterDto.dto';
import { LoginDto } from './dto/LoginDto.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(registerDto: RegisterDto) {
    const { username, password } = registerDto;

    const existingUser = await this.prisma.users.findFirst({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('User with this username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.users.create({
      data: {
        username,
        password: hashedPassword,
      },
    });

    return {
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }
  
  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.prisma.users.findFirst({ where: { username } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
