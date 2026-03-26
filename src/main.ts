import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConsoleLogger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
     logger: new ConsoleLogger({
     prefix: 'Backend - Project',
     }),
  });

  const config = new DocumentBuilder()
    .setTitle('Group 5 Hotel Booking System API')
    .setDescription(
    [
      'API for managing hotel rooms and bookings within the Hotel Booking System.',
      '',
      'Rate limiting:',
      '- 100 requests per minute per access token.',
      '- Exceeding the limit returns 429 Too Many Requests with a standard error body.',
    ].join('\n'),
  )
    .setVersion('1.0.0')
    .addTag('rooms')
    .addTag('bookings')
    .addTag('users')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Use: Authorization: Bearer <access_token>',
        in: 'header',
      },
      'access-token', // Security name used in decorators
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

