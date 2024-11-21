import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CreateUserDto } from '../auth/dto/user/create-user.dto';
import { UserService } from './users.service';

@Controller('users')
export class UsersController {

  constructor(private readonly usersService: UserService) { }

  @Get('all')
  async getAllUsers() { //! For Development Purposes Only!
    return await this.usersService.findUsers();
  }

  @Get()
  async getUsers(@Query('email') email?: string) {
    if (email) {
      const userByEmail = await this.usersService.findOneByEmail(email);
      if (userByEmail && userByEmail.email.includes(email)) {
        return userByEmail;
      }
    } else {
      await this.usersService.findUsers();
    }
  }

  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.findOneById(id);
  }

  @Post('add')
  async insertNewUser(@Body() newUserDto: CreateUserDto) {
    return await this.usersService.createUser(newUserDto);
  }

}