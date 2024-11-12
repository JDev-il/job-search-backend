import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalGuards(new JwtAuthGuard());
  app.get(ConfigService);
  app.enableCors({
    origin: 'http://localhost:4200', // Allow requests only from the Angular app's URL
    methods: 'GET,POST,PUT,DELETE',  // Specify allowed methods if needed
    credentials: true,               // Allow cookies if necessary
  });
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,            // Strip any properties not in the DTO
    forbidNonWhitelisted: true, // Throw error if unexpected properties are found
    transform: true,
  }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
