import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, ConsoleLogger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'nest-lab',
    }),
  });

  const config = new DocumentBuilder()
    .setTitle('Group 5 Hotel Booking System API')
    .setDescription(
      [
        'API for managing hotel rooms, users, bookings, notifications, and authentication in the Hotel Booking System.',
        '',
        'Rate limiting:',
        '- Global: 30 requests per minute.',
        '- Rooms and booking endpoints: custom route limits are applied.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addTag('auth')
    .addTag('users')
    .addTag('rooms')
    .addTag('search')
    .addTag('bookings')
    .addTag('notifications')
    .addTag('health')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Use: Authorization: Bearer <access_token>',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();