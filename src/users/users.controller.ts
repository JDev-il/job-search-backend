import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { UserService } from './users.service';

@Controller('users')
export class UsersController {

  constructor(private readonly usersService: UserService) { }

  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.findOne(id);
  }

  @Post('add')
  insertNewUser() {
    // send req to service
  }

}