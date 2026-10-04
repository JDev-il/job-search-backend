import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';

dotenv.config({ path: './.env' });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  app.disable('x-powered-by');
  app.setGlobalPrefix('api');
  app.enableCors({
    // Pinned to the real client origin instead of reflecting every origin.
    // FRONTEND_URL is already set in prod for the Google OAuth redirect, so
    // this reuses it rather than hardcoding the domain twice; the literal
    // is only a fallback for local/dev runs that don't set it.
    origin: configService.get<string>('FRONTEND_URL') || 'https://cv-tracker.wedevz.io',
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
