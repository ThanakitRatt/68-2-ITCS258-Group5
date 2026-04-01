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
import { Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService, private redisClient: RedisService) {}

  private readonly logger = new Logger('AuthService');

  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    const existingUser = await this.prisma.users.findFirst({
      where: { email },
    });

    if (existingUser) {
      this.logger.warn(`User with email ${email} already exists`);
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.prisma.users.create({
      data: {
        name: registerDto.name,
        email,
        password: hashedPassword,
      },
    });

    this.logger.log(`User ${user.id} registered with email ${email}`);

    return {
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  }
  
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.users.findFirst({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      this.logger.log(`User ${user.id} authenticated successfully with email ${email}`);
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      this.logger.warn(`Invalid login attempt for email ${loginDto.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }
    const payload = { email: user.email, id: user.id, role: user.Role };
    this.logger.log(`User ${user.id} logged in with email ${user.email}`);
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async logout(token: string) {
    const decoded = this.jwtService.decode(token) as any;

    if (!decoded || !decoded.exp) {
      this.logger.warn(`Invalid token provided for logout`);
      throw new UnauthorizedException('Invalid token');
    }

    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    if (expiresIn <= 0) {
      this.logger.warn(`Token already expired for logout`);
      return { message: 'Token already expired' };
    }

    try {
      await this.redisClient.set(`blacklist:${token}`, '1', 'EX', expiresIn);
    } catch (err) {
      this.logger.error(`Logout failed`);
      throw new Error('Logout failed');
    }

    this.logger.log(`User logged out successfully, token blacklisted`);
    return { message: 'Logged out successfully' };
  }
}
