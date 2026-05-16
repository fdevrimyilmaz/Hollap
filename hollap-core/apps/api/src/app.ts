import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { authRouter } from "./modules/auth/auth.routes";
import { healthRouter } from "./modules/health/health.routes";
import { mediaRouter } from "./modules/media/media.routes";
import { stageRouter } from "./modules/stage/stage.routes";
import { subscriptionsController } from "./modules/subscriptions/subscriptions.controller";
import { subscriptionsRouter } from "./modules/subscriptions/subscriptions.routes";
import { teachersRouter } from "./modules/teachers/teachers.routes";
import { wallRouter } from "./modules/wall/wall.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(morgan("dev"));
  app.use(cookieParser());

  // Stripe needs raw body for signature validation.
  app.post(
    "/api/subscriptions/webhook",
    express.raw({ type: "application/json" }),
    subscriptionsController.webhook,
  );

  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/teachers", teachersRouter);
  app.use("/api/subscriptions", subscriptionsRouter);
  app.use("/api/stage", stageRouter);
  app.use("/api/wall", wallRouter);
  app.use("/api/media", mediaRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
