import { prisma } from '../../lib/prisma.js';
import { verifyPassword } from '../../lib/password.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../lib/jwt.js';
import { UnauthorizedError } from '../../lib/errors.js';
import type { LoginInput } from './auth.schema.js';

function publicUser(user: {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  role: { name: string; permissions: { permission: { code: string } }[] };
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: { id: user.roleId, name: user.role.name },
    permissions: user.role.permissions.map((rp) => rp.permission.code),
  };
}

const userInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
} as const;

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: userInclude,
  });

  // Same error whether the email is unknown or the password is wrong, to avoid
  // leaking which accounts exist.
  const invalid = new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  if (!user) throw invalid;
  if (!user.isActive) throw new UnauthorizedError('Account is disabled', 'ACCOUNT_INACTIVE');

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) throw invalid;

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role.name,
  });
  const refreshToken = signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion });

  return { user: publicUser(user), accessToken, refreshToken };
}

export async function refresh(refreshToken: string | undefined) {
  if (!refreshToken) throw new UnauthorizedError('Refresh token required', 'NO_REFRESH_TOKEN');

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Refresh token expired', 'REFRESH_EXPIRED');
    }
    throw new UnauthorizedError('Invalid refresh token', 'REFRESH_INVALID');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: userInclude });
  if (!user || !user.isActive || user.tokenVersion !== payload.tokenVersion) {
    throw new UnauthorizedError('Session is no longer valid', 'SESSION_REVOKED');
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role.name });
  return { user: publicUser(user), accessToken };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
  if (!user) throw new UnauthorizedError('Account no longer exists', 'ACCOUNT_INACTIVE');
  return publicUser(user);
}
