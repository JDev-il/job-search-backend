import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';

dotenv.config({ path: './.env' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.get(ConfigService);
  app.setGlobalPrefix('api');
  app.enableCors({
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();