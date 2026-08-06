"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Check, Copy, Loader2, CircleCheck, CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

function LinhaCopiavel({ label, valor }: { label: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="bg-background flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <code className="block truncate text-sm">{valor}</code>
      </div>
      <Button type="button" variant="ghost" size="icon-sm" onClick={copiar} aria-label={`Copiar ${label}`}>
        {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

const dominioSchema = z.object({
  dominioProprio: z
    .string()
    .trim()
    .toLowerCase()
    .refine((valor) => valor === "" || /^[a-z0-9.-]+\.[a-z]{2,}$/.test(valor), {
      message: "Informe um domínio válido, ex.: www.minhaloja.com.br",
    }),
});

type DominioFormValues = z.infer<typeof dominioSchema>;

// Único campo desta tela de personalização já conectado a dado real —
// o resto de LojaForm segue mockado até o backend de personalização geral
// da loja ser feito. Isolado num componente próprio para não confundir os
// dois no mesmo formulário.
export function DominioProprioForm() {
  const [instrucoesPara, setInstrucoesPara] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const { data: loja, isLoading } = trpc.loja.atual.useQuery();

  const form = useForm<DominioFormValues>({
    resolver: zodResolver(dominioSchema),
    values: { dominioProprio: loja?.dominioProprio ?? "" },
  });

  // Consulta se o DNS já está apontando certo pra Vercel — só existe quando
  // a integração automática está configurada nesta instalação (senão a
  // query volta null e a tela cai para as instruções manuais de sempre).
  // Poll leve enquanto o domínio ainda não propagou, pra não deixar o
  // lojista precisando ficar recarregando a página pra saber se já ativou.
  const statusDominio = trpc.loja.statusDominioProprio.useQuery(undefined, {
    enabled: Boolean(loja?.dominioProprio),
    refetchInterval: (query) => (query.state.data?.configurado ? false : 15000),
  });

  const salvar = trpc.loja.atualizarDominioProprio.useMutation({
    onSuccess: (resultado) => {
      utils.loja.atual.invalidate();
      utils.loja.statusDominioProprio.invalidate();
      toast.success(
        resultado.dominioProprio
          ? "Domínio salvo. Configure o DNS para ativá-lo."
          : "Domínio personalizado removido.",
      );
      setInstrucoesPara(resultado.dominioProprio);
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível salvar o domínio.");
    },
  });

  function onSubmit(values: DominioFormValues) {
    salvar.mutate({ dominioProprio: values.dominioProprio || null });
  }

  const dominioAtivo = instrucoesPara ?? loja?.dominioProprio;
  const plataforma = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "plataforma.com";

  // Domínio raiz/apex (ex.: minhaloja.com.br) não aceita registro CNAME na
  // maioria dos provedores — só subdomínios (ex.: www.minhaloja.com.br)
  // aceitam. Detecta pela contagem de pontos para orientar o lojista a usar
  // "www" em vez do domínio nu, evitando o erro mais comum desse fluxo.
  const ehDominioRaiz = dominioAtivo ? dominioAtivo.split(".").length <= 2 : false;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="dominioProprio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domínio personalizado</FormLabel>
              <FormControl>
                <Input placeholder="www.minhaloja.com.br" disabled={isLoading} {...field} />
              </FormControl>
              <FormDescription>
                Opcional. Use o endereço que seus clientes vão digitar, por exemplo{" "}
                <span className="font-medium">www.minhaloja.com.br</span>. Deixe em branco e salve
                para remover um domínio já configurado.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {dominioAtivo && (
          <div className="bg-muted flex flex-col gap-4 rounded-lg border p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">Como ativar {dominioAtivo}</p>
              {statusDominio.data && (
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                    statusDominio.data.configurado
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                  )}
                >
                  {statusDominio.data.configurado ? (
                    <>
                      <CircleCheck className="size-3.5" /> Ativo
                    </>
                  ) : (
                    <>
                      {statusDominio.isFetching ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <CircleAlert className="size-3.5" />
                      )}
                      Aguardando DNS
                    </>
                  )}
                </span>
              )}
            </div>

            {ehDominioRaiz && (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-700 dark:text-amber-400">
                Você digitou um domínio raiz (sem &quot;www&quot;). A maioria dos provedores não
                permite apontar um domínio raiz direto para outro serviço — prefira{" "}
                <span className="font-medium">www.{dominioAtivo}</span> aqui em cima. Se quiser que
                o domínio sem &quot;www&quot; também funcione, seu provedor costuma ter uma opção
                de &quot;redirecionar&quot; ou &quot;encaminhar&quot; o domínio raiz para o www.
              </p>
            )}

            <ol className="text-muted-foreground flex list-decimal flex-col gap-3 pl-4">
              <li>
                Acesse o painel do provedor onde você registrou o domínio (Registro.br,
                GoDaddy, Hostinger, Cloudflare etc.) e procure a seção de <span className="font-medium">DNS</span> ou{" "}
                <span className="font-medium">Zona de DNS</span>.
              </li>
              <li className="flex flex-col gap-2">
                Crie (ou edite) um registro do tipo <span className="font-medium">CNAME</span> com
                estes valores:
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <LinhaCopiavel label="Nome / Host" valor={dominioAtivo} />
                  </div>
                  <div className="flex-1">
                    <LinhaCopiavel label="Aponta para (valor / destino)" valor={plataforma} />
                  </div>
                </div>
              </li>
              <li>
                Salve a alteração no provedor. A propagação do DNS costuma levar de alguns
                minutos até 24 horas — em geral é bem mais rápido que isso.
              </li>
              <li>
                {statusDominio.data
                  ? `Pronto — assim que o DNS propagar, o selo acima muda para "Ativo" sozinho e ${dominioAtivo} passa a abrir sua loja automaticamente, sem precisar de mais nenhum passo.`
                  : "Avise a equipe da plataforma que o DNS foi configurado — a ativação final é feita manualmente por lá."}
              </li>
            </ol>

            <p className="text-muted-foreground text-xs">
              Quer conferir se já propagou? Pesquise por &quot;verificar propagação DNS&quot; e
              informe {dominioAtivo} — se o resultado apontar para {plataforma}, está certo.
              Enquanto isso não acontece, sua loja continua funcionando normalmente pelo endereço
              padrão da plataforma.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={salvar.isPending || isLoading}>
            {salvar.isPending ? "Salvando..." : "Salvar domínio"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
