import { router } from "./trpc";
import { produtosRouter } from "./routers/produtos";
import { categoriasRouter } from "./routers/categorias";
import { estoqueRouter } from "./routers/estoque";
import { lojaRouter } from "./routers/loja";
import { onboardingRouter } from "./routers/onboarding";
import { authRouter } from "./routers/auth";

export const appRouter = router({
  produtos: produtosRouter,
  categorias: categoriasRouter,
  estoque: estoqueRouter,
  loja: lojaRouter,
  onboarding: onboardingRouter,
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
