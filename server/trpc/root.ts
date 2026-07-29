import { router } from "./trpc";
import { produtosRouter } from "./routers/produtos";

export const appRouter = router({
  produtos: produtosRouter,
});

export type AppRouter = typeof appRouter;
