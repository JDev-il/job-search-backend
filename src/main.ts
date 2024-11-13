import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';

dotenv.config({ path: './.env' }); // Explicit path

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.get(ConfigService);
  app.enableCors({
    // origin: 'http://localhost:4200',
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    // forbidNonWhitelisted: true, // Throw error if unexpected properties are found
    transform: true,
  }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
