import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CreateUserDto } from '../auth/dto/user/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { NewUserDto } from '../auth/dto/user/login-user.dto';
import { UserService } from './users.service';

interface AuthedRequest extends Request {
  user: { userId: number; email: string };
}

@Controller('users')
export class UsersController {

  constructor(private readonly usersService: UserService) { }

  // Was GET /users/user?user_id=<anything> with no auth — anyone could look
  // up any other user's full record by email. Now it's guarded and always
  // resolves to the caller's own account; the query param is gone, since
  // the only legitimate caller (the client's "fetch my profile" flow,
  // right after /auth/verify) only ever wants its own data anyway.
  @UseGuards(JwtAuthGuard)
  @Get('user')
  async getUser(@Req() req: AuthedRequest) {
    return await this.usersService.findOneByEmail(req.user.email);
  }

  // GET /users/all is removed entirely — it returned every user's email,
  // name and Gmail address with no auth at all (it was marked
  // "For Development Purposes Only!" but was still live). Nothing in the
  // client called it (confirmed: configuration.service.ts never references
  // a users/all endpoint).

  // Was public and took an arbitrary numeric id. Now guarded, and the id
  // must match the caller's own userId — a 403 instead of leaking another
  // user's record.
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getUserById(@Req() req: AuthedRequest, @Param('id', ParseIntPipe) id: number) {
    if (id !== req.user.userId) {
      throw new ForbiddenException('Cannot access another user\'s record');
    }
    return await this.usersService.findOneById(id);
  }

  @Post('add')
  async insertNewUser(@Body() newUserDto: CreateUserDto): Promise<NewUserDto> {
    return await this.usersService.createUser(newUserDto);
  }

}
