import { createServer } from "node:http";
import { Server } from "socket.io";
import { env } from "./config/env";
import { redisStore } from "./lib/redis";
import { createApp } from "./app";
import { setupStageGateway } from "./socket/stage.gateway";

async function bootstrap() {
  await redisStore.connect();

  const app = createApp();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  setupStageGateway(io);

  httpServer.listen(env.API_PORT, () => {
    console.log(`Hollap Core API listening on ${env.API_BASE_URL}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap API", error);
  process.exit(1);
});
