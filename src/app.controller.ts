import { Controller } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {

    console.log(process.env.DB_HOST); // Should print the value of DB_HOST from .env

  }
}