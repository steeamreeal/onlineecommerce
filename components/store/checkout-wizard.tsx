"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/store/cart-context";
import { CheckoutUpsell } from "@/components/store/checkout-upsell";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@/lib/trpc/types";

type OpcaoFrete = RouterOutputs["lojaPublica"]["frete"][number];
type Cupom = RouterOutputs["lojaPublica"]["validarCupom"];

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const STEPS = ["Identificação", "Entrega", "Pagamento", "Confirmação"] as const;

const FORMAS_PAGAMENTO = [
  { value: "PIX", label: "Pix" },
  { value: "CARTAO", label: "Cartão de crédito" },
  { value: "PAGAMENTO_ENTREGA", label: "Pagamento na entrega/retirada" },
] as const;

type Identificacao = { nome: string; telefone: string; email: string };
type Entrega = {
  modo: "RETIRADA" | "ENTREGA";
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  freteId?: string;
};

const ENTREGA_VAZIA: Entrega = {
  modo: "RETIRADA",
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
};

// ViaCEP não exige autenticação/chave — busca pública por CEP, usada só para
// pré-preencher rua/bairro/cidade/UF; o cliente ainda confirma número e
// complemento, que o CEP não sabe.
async function buscarEnderecoPorCep(cep: string) {
  const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const dados = await resposta.json();
  if (dados.erro) return null;
  return {
    rua: dados.logradouro as string,
    bairro: dados.bairro as string,
    cidade: dados.localidade as string,
    estado: dados.uf as string,
  };
}
type Pagamento = {
  forma: (typeof FORMAS_PAGAMENTO)[number]["value"];
  cupomCodigo: string;
};

function OpcaoSelecionavel({
  selecionada,
  onClick,
  className,
  children,
}: {
  selecionada: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border px-4 py-2.5 text-left text-sm",
        selecionada ? "border-primary bg-primary/5" : "hover:border-primary/40",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function CheckoutWizard({ slug }: { slug: string }) {
  const { itensDetalhados, subtotal, limparCarrinho, hidratado } = useCart();
  const [step, setStep] = useState(0);
  const [linkPagamento, setLinkPagamento] = useState<string | null | undefined>(undefined);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const { data: opcoesFrete } = trpc.lojaPublica.frete.useQuery({ slug });
  const opcoesFreteAtivas = opcoesFrete ?? [];
  const { data: config } = trpc.lojaPublica.porSlug.useQuery({ slug });
  const criarPedido = trpc.checkout.criarPedido.useMutation();

  // Sem Mercado Pago conectado, a loja só pode receber na entrega — evita o
  // cliente escolher PIX/cartão e só descobrir o erro na confirmação. Se a
  // seleção atual (default "PIX") não estiver mais disponível, cai para
  // pagamento na entrega direto na renderização, sem depender de efeito.
  const formasPagamentoDisponiveis = config?.aceitaPagamentoOnline
    ? FORMAS_PAGAMENTO
    : FORMAS_PAGAMENTO.filter((f) => f.value === "PAGAMENTO_ENTREGA");

  const [identificacao, setIdentificacao] = useState<Identificacao>({
    nome: "",
    telefone: "",
    email: "",
  });
  const [entrega, setEntrega] = useState<Entrega>(ENTREGA_VAZIA);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState<string | null>(null);
  const [pagamento, setPagamento] = useState<Pagamento>({ forma: "PIX", cupomCodigo: "" });
  const [cupomAplicado, setCupomAplicado] = useState<Cupom | null>(null);
  const [erroCupom, setErroCupom] = useState<string | null>(null);

  async function handleCepChange(valor: string) {
    const cep = valor.replace(/\D/g, "").slice(0, 8);
    setEntrega((v) => ({ ...v, cep }));
    setErroCep(null);
    if (cep.length !== 8) return;
    setBuscandoCep(true);
    try {
      const endereco = await buscarEnderecoPorCep(cep);
      if (!endereco) {
        setErroCep("CEP não encontrado.");
        return;
      }
      setEntrega((v) => ({ ...v, ...endereco }));
    } catch {
      setErroCep("Não foi possível buscar o CEP. Preencha o endereço manualmente.");
    } finally {
      setBuscandoCep(false);
    }
  }

  const utils = trpc.useUtils();

  const formaPagamentoEfetiva = formasPagamentoDisponiveis.some((f) => f.value === pagamento.forma)
    ? pagamento.forma
    : "PAGAMENTO_ENTREGA";

  const freteEscolhido: OpcaoFrete | undefined =
    entrega.modo === "RETIRADA"
      ? opcoesFreteAtivas.find((o) => o.tipo === "RETIRADA")
      : opcoesFreteAtivas.find((o) => o.id === entrega.freteId);

  const valorFrete = useMemo(() => {
    if (!freteEscolhido) return 0;
    if (cupomAplicado?.tipo === "FRETE_GRATIS") return 0;
    const freteGratisAcimaDe = freteEscolhido.freteGratisAcimaDe
      ? Number(freteEscolhido.freteGratisAcimaDe)
      : undefined;
    if (freteGratisAcimaDe && subtotal >= freteGratisAcimaDe) return 0;
    return freteEscolhido.valor ? Number(freteEscolhido.valor) : 0;
  }, [freteEscolhido, cupomAplicado, subtotal]);

  const desconto = useMemo(() => {
    if (!cupomAplicado) return 0;
    const valor = cupomAplicado.valor ? Number(cupomAplicado.valor) : 0;
    if (cupomAplicado.tipo === "PERCENTUAL") return subtotal * (valor / 100);
    if (cupomAplicado.tipo === "VALOR_FIXO") return Math.min(valor, subtotal);
    return 0;
  }, [cupomAplicado, subtotal]);

  const total = Math.max(0, subtotal + valorFrete - desconto);

  async function aplicarCupom() {
    const codigo = pagamento.cupomCodigo.trim().toUpperCase();
    if (!codigo) return;
    try {
      const cupom = await utils.lojaPublica.validarCupom.fetch({
        slug,
        codigo,
        produtoIds: itensDetalhados.map((i) => i.produtoId),
      });
      setErroCupom(null);
      setCupomAplicado(cupom);
    } catch {
      setErroCupom("Cupom inválido ou expirado.");
      setCupomAplicado(null);
    }
  }

  function podeAvancar(): boolean {
    if (step === 0) {
      return (
        identificacao.nome.trim().length > 1 &&
        identificacao.telefone.trim().length > 7 &&
        identificacao.email.trim().includes("@")
      );
    }
    if (step === 1) {
      if (entrega.modo === "RETIRADA") return true;
      return (
        entrega.cep.length === 8 &&
        entrega.rua.trim().length > 0 &&
        entrega.numero.trim().length > 0 &&
        entrega.cidade.trim().length > 0 &&
        entrega.estado.trim().length > 0 &&
        Boolean(entrega.freteId)
      );
    }
    return true;
  }

  async function confirmarPedido() {
    setErroEnvio(null);
    try {
      const resultado = await criarPedido.mutateAsync({
        slug,
        cliente: {
          nome: identificacao.nome.trim(),
          telefone: identificacao.telefone.trim(),
          email: identificacao.email.trim(),
        },
        modoEntrega: entrega.modo,
        endereco:
          entrega.modo === "ENTREGA"
            ? {
                cep: entrega.cep,
                rua: entrega.rua.trim(),
                numero: entrega.numero.trim(),
                bairro: entrega.bairro.trim() || undefined,
                cidade: entrega.cidade.trim(),
                estado: entrega.estado.trim(),
              }
            : undefined,
        freteId: entrega.modo === "ENTREGA" ? entrega.freteId : undefined,
        formaPagamento: formaPagamentoEfetiva,
        itens: itensDetalhados.map((item) => ({
          produtoId: item.produtoId,
          variacaoId: item.variacao ? item.variacaoId : undefined,
          quantidade: item.quantidade,
        })),
        cupomCodigo: cupomAplicado?.codigo,
      });
      setLinkPagamento(resultado.linkPagamento);
      setPedidoId(resultado.pedido.id);
      limparCarrinho();
    } catch (erro) {
      // Erros de validação do checkout (ex.: "loja não configurou o
      // pagamento online") já vêm em português e sem jargão técnico —
      // mostramos direto. Qualquer outro erro (rede, 500) cai na mensagem
      // genérica para não expor detalhe interno ao cliente final.
      const mensagem =
        erro instanceof Error && erro.name === "TRPCClientError"
          ? erro.message
          : "Não foi possível confirmar seu pedido. Tente novamente.";
      setErroEnvio(mensagem);
    }
  }

  const pedidoConfirmado = linkPagamento !== undefined;

  if (!hidratado) return null;

  if (itensDetalhados.length === 0 && !pedidoConfirmado) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-muted-foreground">Seu carrinho está vazio.</p>
        <Button nativeButton={false} render={<Link href={`/loja/${slug}/produtos`} />}>
          Ver produtos
        </Button>
      </div>
    );
  }

  if (pedidoConfirmado) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <CheckCircle2 className="text-success size-12" />
        <h1 className="text-2xl font-semibold">Pedido confirmado!</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          {linkPagamento
            ? "Recebemos seu pedido. Finalize o pagamento no link abaixo para que ele seja preparado."
            : "Recebemos seu pedido. Em breve entraremos em contato pelo WhatsApp informado para confirmar os próximos passos."}
        </p>
        {linkPagamento && (
          <Button nativeButton={false} render={<a href={linkPagamento} target="_blank" rel="noreferrer" />}>
            Pagar agora
          </Button>
        )}
        {pedidoId && (
          <Button
            nativeButton={false}
            variant="outline"
            render={<Link href={`/loja/${slug}/pedido/${pedidoId}`} />}
          >
            Acompanhar meu pedido
          </Button>
        )}
        <Button
          nativeButton={false}
          variant={linkPagamento || pedidoId ? "outline" : "default"}
          render={<Link href={`/loja/${slug}`} />}
        >
          Voltar para a loja
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-8">
      <div className="flex items-center gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                index <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}
            </div>
            <span
              className={cn(
                "hidden text-sm sm:block",
                index === step ? "font-medium" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {index < STEPS.length - 1 && <div className="bg-border h-px flex-1" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Nome completo</Label>
            <Input
              value={identificacao.nome}
              onChange={(e) => setIdentificacao((v) => ({ ...v, nome: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>WhatsApp / telefone</Label>
            <Input
              value={identificacao.telefone}
              onChange={(e) => setIdentificacao((v) => ({ ...v, telefone: e.target.value }))}
              placeholder="(11) 91234-5678"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={identificacao.email}
              onChange={(e) => setIdentificacao((v) => ({ ...v, email: e.target.value }))}
            />
            <p className="text-muted-foreground text-xs">
              Usamos para avisar sobre o status do seu pedido (pagamento confirmado, envio, etc).
            </p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <OpcaoSelecionavel
              className="flex-1 py-3"
              selecionada={entrega.modo === "RETIRADA"}
              onClick={() => setEntrega({ ...ENTREGA_VAZIA, modo: "RETIRADA" })}
            >
              <span className="font-medium">Retirar na loja</span>
              <p className="text-muted-foreground text-xs">Sem custo de frete</p>
            </OpcaoSelecionavel>
            <OpcaoSelecionavel
              className="flex-1 py-3"
              selecionada={entrega.modo === "ENTREGA"}
              onClick={() => setEntrega((v) => ({ ...v, modo: "ENTREGA" }))}
            >
              <span className="font-medium">Entregar no meu endereço</span>
              <p className="text-muted-foreground text-xs">Escolha a forma de envio</p>
            </OpcaoSelecionavel>
          </div>

          {entrega.modo === "ENTREGA" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>CEP</Label>
                <Input
                  value={entrega.cep}
                  onChange={(e) => handleCepChange(e.target.value)}
                  placeholder="00000-000"
                  inputMode="numeric"
                  maxLength={8}
                />
                {buscandoCep && (
                  <span className="text-muted-foreground text-xs">Buscando endereço...</span>
                )}
                {erroCep && <span className="text-destructive text-xs">{erroCep}</span>}
              </div>

              {entrega.rua && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label>Rua</Label>
                    <Input
                      value={entrega.rua}
                      onChange={(e) => setEntrega((v) => ({ ...v, rua: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Número</Label>
                    <Input
                      value={entrega.numero}
                      onChange={(e) => setEntrega((v) => ({ ...v, numero: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Bairro</Label>
                    <Input
                      value={entrega.bairro}
                      onChange={(e) => setEntrega((v) => ({ ...v, bairro: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Cidade</Label>
                    <Input
                      value={entrega.cidade}
                      onChange={(e) => setEntrega((v) => ({ ...v, cidade: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>UF</Label>
                    <Input
                      value={entrega.estado}
                      onChange={(e) => setEntrega((v) => ({ ...v, estado: e.target.value }))}
                      maxLength={2}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label>Forma de envio</Label>
                {opcoesFreteAtivas
                  .filter((o) => o.tipo !== "RETIRADA")
                  .map((opcao) => (
                    <OpcaoSelecionavel
                      key={opcao.id}
                      className="flex items-center justify-between"
                      selecionada={entrega.freteId === opcao.id}
                      onClick={() => setEntrega((v) => ({ ...v, freteId: opcao.id }))}
                    >
                      <span>{opcao.nome}</span>
                      <span className="text-muted-foreground">
                        {opcao.valor ? formatoMoeda.format(Number(opcao.valor)) : "A calcular"}
                      </span>
                    </OpcaoSelecionavel>
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Forma de pagamento</Label>
            {formasPagamentoDisponiveis.map((opcao) => (
              <OpcaoSelecionavel
                key={opcao.value}
                selecionada={formaPagamentoEfetiva === opcao.value}
                onClick={() => setPagamento((v) => ({ ...v, forma: opcao.value }))}
              >
                {opcao.label}
              </OpcaoSelecionavel>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cupom de desconto</Label>
            <div className="flex gap-2">
              <Input
                value={pagamento.cupomCodigo}
                onChange={(e) => setPagamento((v) => ({ ...v, cupomCodigo: e.target.value }))}
                placeholder="Ex.: BEMVINDO20"
              />
              <Button type="button" variant="outline" onClick={aplicarCupom}>
                Aplicar
              </Button>
            </div>
            {erroCupom && <span className="text-destructive text-xs">{erroCupom}</span>}
            {cupomAplicado && (
              <span className="text-success text-xs">
                Cupom {cupomAplicado.codigo} aplicado.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Visível em todas as etapas antes da confirmação — o cliente sempre
          tem uma última chance de adicionar produto, mesmo que não tenha
          adicionado nada durante a etapa de Entrega. Some na Confirmação
          (etapa final, só revisão antes de fechar o pedido). */}
      {step < 3 && <CheckoutUpsell slug={slug} />}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
            {itensDetalhados.map((item) => (
              <div key={item.variacaoId} className="flex justify-between">
                <span>
                  {item.produto.nome} ({item.variacaoNome}) x{item.quantidade}
                </span>
                <span>{formatoMoeda.format(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatoMoeda.format(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>{valorFrete === 0 ? "Grátis" : formatoMoeda.format(valorFrete)}</span>
            </div>
            {desconto > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desconto</span>
                <span>-{formatoMoeda.format(desconto)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatoMoeda.format(total)}</span>
            </div>
          </div>
          <div className="text-muted-foreground rounded-lg border p-4 text-xs">
            <p>
              {[identificacao.nome, identificacao.telefone, identificacao.email]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p>
              {entrega.modo === "RETIRADA"
                ? "Retirada na loja"
                : `Entrega: ${entrega.rua}, ${entrega.numero} — ${entrega.bairro}, ${entrega.cidade}/${entrega.estado} — ${freteEscolhido?.nome ?? ""}`}
            </p>
          </div>
          {erroEnvio && <span className="text-destructive text-xs">{erroEnvio}</span>}
        </div>
      )}

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" disabled={!podeAvancar()} onClick={() => setStep((s) => s + 1)}>
            Avançar
          </Button>
        ) : (
          <Button type="button" disabled={criarPedido.isPending} onClick={confirmarPedido}>
            {criarPedido.isPending ? "Enviando..." : "Confirmar pedido"}
          </Button>
        )}
      </div>
    </div>
  );
}
