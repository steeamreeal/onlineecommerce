"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/store/cart-context";
import { opcoesFreteMock, type OpcaoFrete } from "@/lib/mocks/frete";
import { cuponsMock, cupomStatus, type Cupom } from "@/lib/mocks/cupons";

const formatoMoeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const STEPS = ["Identificação", "Entrega", "Pagamento", "Confirmação"] as const;

const FORMAS_PAGAMENTO = [
  { value: "PIX", label: "Pix" },
  { value: "CARTAO", label: "Cartão de crédito" },
  { value: "NA_ENTREGA", label: "Pagamento na entrega/retirada" },
] as const;

const opcoesFreteAtivas = opcoesFreteMock.filter((o) => o.ativo);

type Identificacao = { nome: string; telefone: string; email: string };
type Entrega = {
  modo: "RETIRADA" | "ENTREGA";
  endereco: string;
  freteId?: string;
};
type Pagamento = { forma: "PIX" | "CARTAO" | "NA_ENTREGA"; cupomCodigo: string };

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
  const { itensDetalhados, subtotal, limparCarrinho } = useCart();
  const [step, setStep] = useState(0);
  const [pedidoConfirmado, setPedidoConfirmado] = useState(false);

  const [identificacao, setIdentificacao] = useState<Identificacao>({
    nome: "",
    telefone: "",
    email: "",
  });
  const [entrega, setEntrega] = useState<Entrega>({ modo: "RETIRADA", endereco: "" });
  const [pagamento, setPagamento] = useState<Pagamento>({ forma: "PIX", cupomCodigo: "" });
  const [cupomAplicado, setCupomAplicado] = useState<Cupom | null>(null);
  const [erroCupom, setErroCupom] = useState<string | null>(null);

  const freteEscolhido: OpcaoFrete | undefined =
    entrega.modo === "RETIRADA"
      ? opcoesFreteMock.find((o) => o.tipo === "RETIRADA")
      : opcoesFreteAtivas.find((o) => o.id === entrega.freteId);

  const valorFrete = useMemo(() => {
    if (!freteEscolhido) return 0;
    if (cupomAplicado?.tipo === "FRETE_GRATIS") return 0;
    if (freteEscolhido.freteGratisAcimaDe && subtotal >= freteEscolhido.freteGratisAcimaDe) {
      return 0;
    }
    return freteEscolhido.valor ?? 0;
  }, [freteEscolhido, cupomAplicado, subtotal]);

  const desconto = useMemo(() => {
    if (!cupomAplicado) return 0;
    if (cupomAplicado.tipo === "PERCENTUAL") return subtotal * ((cupomAplicado.valor ?? 0) / 100);
    if (cupomAplicado.tipo === "VALOR_FIXO") return Math.min(cupomAplicado.valor ?? 0, subtotal);
    return 0;
  }, [cupomAplicado, subtotal]);

  const total = Math.max(0, subtotal + valorFrete - desconto);

  function aplicarCupom() {
    const codigo = pagamento.cupomCodigo.trim().toUpperCase();
    if (!codigo) return;
    const cupom = cuponsMock.find((c) => c.codigo === codigo);
    if (!cupom || cupomStatus(cupom) !== "ATIVO") {
      setErroCupom("Cupom inválido ou expirado.");
      setCupomAplicado(null);
      return;
    }
    setErroCupom(null);
    setCupomAplicado(cupom);
  }

  function podeAvancar(): boolean {
    if (step === 0) {
      return (
        identificacao.nome.trim().length > 1 &&
        identificacao.telefone.trim().length > 7 &&
        (identificacao.email.trim().length === 0 || identificacao.email.trim().includes("@"))
      );
    }
    if (step === 1) {
      if (entrega.modo === "RETIRADA") return true;
      return entrega.endereco.trim().length > 5 && Boolean(entrega.freteId);
    }
    return true;
  }

  function confirmarPedido() {
    setPedidoConfirmado(true);
    limparCarrinho();
  }

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
          Recebemos seu pedido. Em breve entraremos em contato pelo WhatsApp informado para
          confirmar os próximos passos.
        </p>
        <Button nativeButton={false} render={<Link href={`/loja/${slug}`} />}>
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
            <Label>E-mail (opcional)</Label>
            <Input
              type="email"
              value={identificacao.email}
              onChange={(e) => setIdentificacao((v) => ({ ...v, email: e.target.value }))}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <OpcaoSelecionavel
              className="flex-1 py-3"
              selecionada={entrega.modo === "RETIRADA"}
              onClick={() => setEntrega({ modo: "RETIRADA", endereco: "" })}
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
                <Label>Endereço completo</Label>
                <Input
                  value={entrega.endereco}
                  onChange={(e) => setEntrega((v) => ({ ...v, endereco: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade/UF"
                />
              </div>
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
                        {opcao.valor ? formatoMoeda.format(opcao.valor) : "A calcular"}
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
            {FORMAS_PAGAMENTO.map((opcao) => (
              <OpcaoSelecionavel
                key={opcao.value}
                selecionada={pagamento.forma === opcao.value}
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
                : `Entrega: ${entrega.endereco} — ${freteEscolhido?.nome ?? ""}`}
            </p>
          </div>
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
          <Button type="button" onClick={confirmarPedido}>
            Confirmar pedido
          </Button>
        )}
      </div>
    </div>
  );
}
