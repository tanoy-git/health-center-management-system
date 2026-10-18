import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Aegis-HIS-Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-center-id',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`=======================================================`);
  logger.log(`  AEGIS ENTERPRISE HEALTH INFORMATION SYSTEM (HIS) v2.0 `);
  logger.log(`  REST API listening on: http://localhost:${port}/api/v1 `);
  logger.log(`  Architecture: Multi-Tenant DDD Modular Monolith        `);
  logger.log(`  Center Isolation: ACTIVE | Redis Sessions: ACTIVE      `);
  logger.log(`=======================================================`);
}

bootstrap();
