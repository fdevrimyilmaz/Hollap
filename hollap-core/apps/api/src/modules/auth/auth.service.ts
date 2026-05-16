import { UserRole } from "@prisma/client";
import appleSigninAuth from "apple-signin-auth";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { env } from "../../config/env";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import { redisStore } from "../../lib/redis";
import { comparePassword, hashPassword, hashToken } from "../../lib/security";
import { durationToMs } from "../../lib/time";
import type {
  LoginInput,
  OAuthInput,
  RefreshInput,
  RegisterInput,
} from "./auth.schemas";

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

class AuthService {
  async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new HttpError(409, "Email already exists");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role as UserRole,
      },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user?.passwordHash) {
      throw new HttpError(401, "Invalid credentials");
    }

    const passwordMatches = await comparePassword(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new HttpError(401, "Invalid credentials");
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(input: RefreshInput) {
    let payload: jwt.JwtPayload;

    try {
      payload = jwt.verify(input.refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
    } catch {
      throw new HttpError(401, "Invalid refresh token");
    }

    if (payload.type !== "refresh" || !payload.jti || !payload.sub) {
      throw new HttpError(401, "Invalid refresh token");
    }

    const redisToken = await redisStore.get(`session:${payload.jti}`);
    if (!redisToken) {
      throw new HttpError(401, "Session expired");
    }

    const tokenRecord = await prisma.refreshToken.findFirst({
      where: {
        tokenHash: hashToken(input.refreshToken),
        revokedAt: null,
      },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new HttpError(401, "Refresh token expired");
    }

    await this.revokeRefreshTokenByJti(payload.jti);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new HttpError(401, "User not found");
    }

    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
      if (payload.jti) {
        await this.revokeRefreshTokenByJti(payload.jti);
      }
    } catch {
      // Logout should stay idempotent.
    }
  }

  async oauthGoogle(input: OAuthInput) {
    if (env.GOOGLE_CLIENT_ID && input.idToken) {
      const ticket = await googleClient.verifyIdToken({
        idToken: input.idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload?.email) {
        throw new HttpError(400, "Google token does not include email");
      }
      return this.oauthUpsert(payload.email, payload.name ?? "Google User");
    }

    if (!input.mockEmail) {
      throw new HttpError(400, "mockEmail required for local OAuth simulation");
    }

    return this.oauthUpsert(input.mockEmail, input.mockName ?? "Google Mock User");
  }

  async oauthApple(input: OAuthInput) {
    if (env.APPLE_CLIENT_ID && input.idToken) {
      const applePayload = await appleSigninAuth.verifyIdToken(input.idToken, {
        audience: env.APPLE_CLIENT_ID,
      });
      if (!applePayload.email) {
        throw new HttpError(400, "Apple token does not include email");
      }
      return this.oauthUpsert(applePayload.email, input.mockName ?? "Apple User");
    }

    if (!input.mockEmail) {
      throw new HttpError(400, "mockEmail required for local OAuth simulation");
    }

    return this.oauthUpsert(input.mockEmail, input.mockName ?? "Apple Mock User");
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacher: true,
      },
    });
    if (!user) {
      throw new HttpError(404, "User not found");
    }
    return user;
  }

  private async oauthUpsert(email: string, name: string) {
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        role: "STUDENT",
      },
      update: {
        name,
      },
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<TokenPair> {
    const refreshJti = uuid();
    const accessExpiresIn = env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"];
    const refreshExpiresIn = env.REFRESH_TOKEN_TTL as jwt.SignOptions["expiresIn"];

    const accessToken = jwt.sign(
      { sub: userId, email, role, type: "access" },
      env.JWT_ACCESS_SECRET,
      { expiresIn: accessExpiresIn },
    );

    const refreshToken = jwt.sign(
      { sub: userId, type: "refresh", jti: refreshJti },
      env.JWT_REFRESH_SECRET,
      { expiresIn: refreshExpiresIn },
    );

    const refreshMs = durationToMs(env.REFRESH_TOKEN_TTL);
    const expiresAt = new Date(Date.now() + refreshMs);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    await redisStore.set(
      `session:${refreshJti}`,
      userId,
      Math.floor(refreshMs / 1000),
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async revokeRefreshTokenByJti(jti: string) {
    await redisStore.del(`session:${jti}`);
  }
}

export const authService = new AuthService();
