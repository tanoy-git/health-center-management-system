import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  centerId: string;
  sessionId: string;
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'aegis_enterprise_jwt_super_secret_key_2026_clinical_his',
      ),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub || !payload.sessionId) {
      throw new UnauthorizedException('Invalid JWT payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      centerId: payload.centerId,
      sessionId: payload.sessionId,
      permissions: payload.permissions,
    };
  }
}
