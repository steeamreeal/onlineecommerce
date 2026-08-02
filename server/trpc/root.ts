import { router } from "./trpc";
import { produtosRouter } from "./routers/produtos";
import { categoriasRouter } from "./routers/categorias";
import { estoqueRouter } from "./routers/estoque";
import { lojaRouter } from "./routers/loja";
import { onboardingRouter } from "./routers/onboarding";
import { authRouter } from "./routers/auth";
import { clientesRouter } from "./routers/clientes";
import { cuponsRouter } from "./routers/cupons";
import { freteRouter } from "./routers/frete";
import { pedidosRouter } from "./routers/pedidos";
import { dashboardRouter } from "./routers/dashboard";
import { lojaPublicaRouter } from "./routers/loja-publica";
import { checkoutRouter } from "./routers/checkout";
import { pagamentosRouter } from "./routers/pagamentos";

export const appRouter = router({
  produtos: produtosRouter,
  categorias: categoriasRouter,
  estoque: estoqueRouter,
  loja: lojaRouter,
  onboarding: onboardingRouter,
  auth: authRouter,
  clientes: clientesRouter,
  cupons: cuponsRouter,
  frete: freteRouter,
  pedidos: pedidosRouter,
  dashboard: dashboardRouter,
  lojaPublica: lojaPublicaRouter,
  checkout: checkoutRouter,
  pagamentos: pagamentosRouter,
});

export type AppRouter = typeof appRouter;
