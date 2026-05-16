import { UserRole } from "@prisma/client";
import { env } from "../../config/env";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import { stripeClient } from "../../lib/stripe";
import type { TeacherProfileInput } from "./teachers.schemas";

class TeachersService {
  async list(category?: string) {
    return prisma.teacher.findMany({
      where: category ? { category } : undefined,
      select: {
        userId: true,
        bio: true,
        category: true,
        priceMonthly: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async upsertMyProfile(userId: string, input: TeacherProfileInput) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: UserRole.TEACHER,
        avatarUrl: input.profilePhotoUrl,
      },
    });

    return prisma.teacher.upsert({
      where: { userId },
      create: {
        userId,
        bio: input.bio,
        category: input.category,
        priceMonthly: input.priceMonthly,
        assistantIds: input.assistantIds,
      },
      update: {
        bio: input.bio,
        category: input.category,
        priceMonthly: input.priceMonthly,
        assistantIds: input.assistantIds,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });
  }

  async getByTeacherUserId(teacherUserId: string, viewerUserId?: string) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId: teacherUserId },
      select: {
        userId: true,
        bio: true,
        category: true,
        priceMonthly: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new HttpError(404, "Teacher not found");
    }

    let isSubscribed = false;
    if (viewerUserId) {
      const subscription = await prisma.subscription.findUnique({
        where: {
          studentUserId_teacherUserId: {
            studentUserId: viewerUserId,
            teacherUserId,
          },
        },
      });

      isSubscribed = Boolean(subscription?.status === "ACTIVE");
    }

    return {
      ...teacher,
      isSubscribed,
    };
  }

  async getMyStripeStatus(userId: string) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
    });

    if (!teacher) {
      throw new HttpError(404, "Teacher profile not found");
    }

    if (env.STRIPE_MOCK || !stripeClient) {
      return {
        mode: "mock" as const,
        accountId: teacher.stripeAccountId,
        chargesEnabled: teacher.stripeChargesEnabled,
        payoutsEnabled: teacher.stripePayoutsEnabled,
      };
    }

    if (!teacher.stripeAccountId) {
      return {
        mode: "stripe" as const,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
      };
    }

    const account = await stripeClient.accounts.retrieve(teacher.stripeAccountId);
    const chargesEnabled = Boolean(account.charges_enabled);
    const payoutsEnabled = Boolean(account.payouts_enabled);

    await prisma.teacher.update({
      where: { userId },
      data: {
        stripeChargesEnabled: chargesEnabled,
        stripePayoutsEnabled: payoutsEnabled,
      },
    });

    return {
      mode: "stripe" as const,
      accountId: teacher.stripeAccountId,
      chargesEnabled,
      payoutsEnabled,
    };
  }

  async createMyStripeOnboardingLink(userId: string) {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!teacher) {
      throw new HttpError(404, "Teacher profile not found");
    }

    if (env.STRIPE_MOCK || !stripeClient) {
      return {
        mode: "mock" as const,
        url: `${env.CORS_ORIGIN}/moderator?stripe=mock`,
      };
    }

    let stripeAccountId = teacher.stripeAccountId;
    if (!stripeAccountId) {
      const account = await stripeClient.accounts.create({
        type: "express",
        country: env.STRIPE_CONNECT_COUNTRY,
        email: teacher.user.email,
        business_type: "individual",
        metadata: {
          teacherUserId: userId,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      stripeAccountId = account.id;

      await prisma.teacher.update({
        where: { userId },
        data: {
          stripeAccountId,
          stripeChargesEnabled: Boolean(account.charges_enabled),
          stripePayoutsEnabled: Boolean(account.payouts_enabled),
        },
      });
    }

    const refreshUrl =
      env.STRIPE_CONNECT_REFRESH_URL ??
      `${env.CORS_ORIGIN}/moderator?stripe=refresh`;
    const returnUrl =
      env.STRIPE_CONNECT_RETURN_URL ??
      `${env.CORS_ORIGIN}/moderator?stripe=return`;

    const accountLink = await stripeClient.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });

    return {
      mode: "stripe" as const,
      url: accountLink.url,
      accountId: stripeAccountId,
    };
  }
}

export const teachersService = new TeachersService();
