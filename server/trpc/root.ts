import { router } from "./trpc";
import { produtosRouter } from "./routers/produtos";
import { onboardingRouter } from "./routers/onboarding";
import { authRouter } from "./routers/auth";

export const appRouter = router({
  produtos: produtosRouter,
  onboarding: onboardingRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
