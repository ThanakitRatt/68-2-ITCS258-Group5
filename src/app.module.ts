/*
AI Declaration:
I used Gemini for create a report.md based on my results.
I ask Gemini to generate some command and debug but no code was directly copied without modification.

Reflection:
I understand how to implement caching and rate limiting in NestJS using the CacheModule and ThrottlerModule.
In this implementation, I set up a Redis cache store, configured rate limiting.
*/

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, RoomsModule, AuthModule, UsersModule, 
    CacheModule.registerAsync({
      isGlobal: true, // Make cache module available globally
      useFactory: async () => ({
        store: await redisStore({
          socket: {
            host: '127.0.0.1',
            port: 6379,
          },
        }),
        ttl: 5*60, // Cache TTL in seconds (5 minutes)
      }),
    }),
    ThrottlerModule.forRoot([{
      ttl: 60, // Time to live in seconds (1 minute)
      limit: 30,  // Max number of requests within TTL
    }]),],
  controllers: [AppController],
  providers: [AppService, 
    { 
      provide: APP_GUARD, 
      useClass: ThrottlerGuard,
    }],
})
export class AppModule {}
