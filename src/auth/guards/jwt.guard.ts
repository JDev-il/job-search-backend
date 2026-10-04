import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Plain passport-jwt guard: identity is only ever taken from a verified JWT.
// There used to be a bypass here that let a request with no Authorization
// header through whenever the body contained `email` + `password` — that
// meant ANY route guarded with this class could be skipped just by sending
// those two fields, which defeated the guard everywhere it was applied
// beyond /auth/login. The "log in with credentials vs. verify an existing
// token" branching that bypass existed for now lives explicitly inside
// AuthController#login instead.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
