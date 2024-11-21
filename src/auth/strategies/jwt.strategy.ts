import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from '../constants';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract token from Authorization header
      secretOrKey: jwtConstants.secret, // Secret key to verify the token
      ignoreExpiration: false, // Ensure token has not expired
    });
  }

  async validate(payload: any) {
    return { userId: payload.userId, email: payload.email };
  }
  // async validate(payload: any) {
    
  //   // Return decoded payload to the request (e.g., req.user)
  //   return { userId: payload.userId, email: payload.email };
  // }
}