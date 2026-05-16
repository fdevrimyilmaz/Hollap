import type Stripe from "stripe";
import { env } from "../../config/env";
import { HttpError } from "../../lib/http-error";
import { prisma } from "../../lib/prisma";
import { stripeClient } from "../../lib/stripe";
import type { CheckoutInput } from "./subscriptions.schemas";

class SubscriptionsService {
  async createCheckout(studentUserId: string, input: CheckoutInput) {
    if (studentUserId === input.teacherUserId) {
      throw new HttpError(400, "Teacher cannot subscribe to own profile");
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: input.teacherUserId },
      include: { user: true },
    });

    if (!teacher) {
      throw new HttpError(404, "Teacher not found");
    }

    const subscription = await prisma.subscription.upsert({
      where: {
        studentUserId_teacherUserId: {
          studentUserId,
          teacherUserId: input.teacherUserId,
        },
      },
      create: {
        studentUserId,
        teacherUserId: input.teacherUserId,
        status: "PENDING",
      },
      update: {
        status: "PENDING",
      },
    });

    if (env.STRIPE_MOCK || !stripeClient) {
      const mockSessionId = `mock_cs_${subscription.id}`;
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { stripeSessionId: mockSessionId },
      });

      return {
        mode: "mock",
        subscriptionId: subscription.id,
        checkoutSessionId: mockSessionId,
        checkoutUrl: `${env.API_BASE_URL}/api/subscriptions/mock/success?subscriptionId=${subscription.id}`,
      };
    }

    const session = await this.createStripeSession({
      studentUserId,
      teacherUserId: input.teacherUserId,
      subscriptionId: subscription.id,
      teacherPriceMonthly: teacher.priceMonthly,
      teacherName: teacher.user.name,
      connectedStripeAccountId: teacher.stripeAccountId,
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { stripeSessionId: session.id },
    });

    return {
      mode: "stripe",
      subscriptionId: subscription.id,
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  async mockConfirm(subscriptionId: string, studentUserId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription || subscription.studentUserId !== studentUserId) {
      throw new HttpError(404, "Subscription not found");
    }

    return this.activateSubscription(subscription.id);
  }

  async listMine(userId: string) {
    return prisma.subscription.findMany({
      where: { studentUserId: userId },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async canAccessTeacherContent(studentUserId: string, teacherUserId: string) {
    if (studentUserId === teacherUserId) {
      return true;
    }

    const subscription = await prisma.subscription.findUnique({
      where: {
        studentUserId_teacherUserId: {
          studentUserId,
          teacherUserId,
        },
      },
    });

    return subscription?.status === "ACTIVE";
  }

  async canAccessTeacherSpace(userId: string, teacherUserId: string) {
    if (userId === teacherUserId) {
      return true;
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: teacherUserId },
      select: { assistantIds: true },
    });

    if (teacher?.assistantIds.includes(userId)) {
      return true;
    }

    return this.canAccessTeacherContent(userId, teacherUserId);
  }

  async ensureSubscriberOrTeacher(studentUserId: string, teacherUserId: string) {
    const canAccess = await this.canAccessTeacherContent(studentUserId, teacherUserId);
    if (!canAccess) {
      throw new HttpError(403, "Subscription required");
    }
  }

  async ensureTeacherSpaceAccess(userId: string, teacherUserId: string) {
    const canAccess = await this.canAccessTeacherSpace(userId, teacherUserId);
    if (!canAccess) {
      throw new HttpError(403, "Subscription required");
    }
  }

  async handleWebhook(rawBody: Buffer, signature?: string | string[]) {
    if (env.STRIPE_MOCK) {
      const parsed = JSON.parse(rawBody.toString("utf8")) as {
        type: string;
        data?: { subscriptionId?: string };
      };
      if (parsed.type === "checkout.session.completed" && parsed.data?.subscriptionId) {
        await this.activateSubscription(parsed.data.subscriptionId);
      }
      return;
    }

    if (!stripeClient || !env.STRIPE_WEBHOOK_SECRET) {
      throw new HttpError(500, "Stripe not configured");
    }

    const event = stripeClient.webhooks.constructEvent(
      rawBody,
      String(signature),
      env.STRIPE_WEBHOOK_SECRET,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = session.metadata?.subscriptionId;
      if (subscriptionId) {
        await this.activateSubscription(subscriptionId);
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      await prisma.teacher.updateMany({
        where: {
          stripeAccountId: account.id,
        },
        data: {
          stripeChargesEnabled: Boolean(account.charges_enabled),
          stripePayoutsEnabled: Boolean(account.payouts_enabled),
        },
      });
    }
  }

  async activateSubscription(subscriptionId: string) {
    const now = new Date();
    const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "ACTIVE",
        startDate: now,
        endDate,
      },
    });
  }

  private async createStripeSession(params: {
    studentUserId: string;
    teacherUserId: string;
    subscriptionId: string;
    teacherPriceMonthly: number;
    teacherName: string;
    connectedStripeAccountId: string | null;
  }) {
    if (!stripeClient) {
      throw new HttpError(500, "Stripe not initialized");
    }

    if (!params.connectedStripeAccountId) {
      throw new HttpError(400, "Teacher payout account is not connected yet");
    }

    const grossAmount = params.teacherPriceMonthly * 100;
    const applicationFeeAmount = Math.round(grossAmount * env.PLATFORM_FEE_PERCENT);

    if (applicationFeeAmount < 0 || applicationFeeAmount >= grossAmount) {
      throw new HttpError(
        500,
        "Invalid PLATFORM_FEE_PERCENT configuration for Stripe Connect",
      );
    }

    return stripeClient.checkout.sessions.create({
      mode: "payment",
      success_url: `${env.CORS_ORIGIN}/teachers/${params.teacherUserId}?subscription=success`,
      cancel_url: `${env.CORS_ORIGIN}/teachers/${params.teacherUserId}?subscription=cancel`,
      metadata: {
        subscriptionId: params.subscriptionId,
        studentUserId: params.studentUserId,
        teacherUserId: params.teacherUserId,
      },
      payment_intent_data: {
        transfer_data: {
          destination: params.connectedStripeAccountId,
        },
        ...(applicationFeeAmount > 0
          ? {
              application_fee_amount: applicationFeeAmount,
            }
          : {}),
      },
      line_items: [
        {
          price_data: {
            currency: "try",
            product_data: {
              name: `${params.teacherName} - Hollap Aylik Abonelik`,
            },
            unit_amount: grossAmount,
          },
          quantity: 1,
        },
      ],
    });
  }
}

export const subscriptionsService = new SubscriptionsService();
