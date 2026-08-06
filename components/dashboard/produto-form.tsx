"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/client";
import { MidiasProdutoForm, type MidiaProduto } from "@/components/dashboard/midias-produto-form";
import type { RouterOutputs } from "@/lib/trpc/types";

type ProdutoExistente = RouterOutputs["produtos"]["buscarPorId"];

const numeroObrigatorio = (mensagem: string) =>
  z
    .string()
    .min(1, mensagem)
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, mensagem);

const numeroOpcional = () =>
  z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(Number(v)), "Informe um número válido");

const variacaoSchema = z
  .object({
    id: z.string().optional(),
    cor: z.string().optional(),
    tamanho: z.string().optional(),
    modelo: z.string().optional(),
    estoque: z
      .string()
      .min(1, "Informe o estoque")
      .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Não pode ser negativo"),
    fotoUrl: z.string().optional(),
  })
  .refine((v) => v.cor || v.tamanho || v.modelo, {
    message: "Informe cor, tamanho ou modelo",
    path: ["cor"],
  });

const produtoSchema = z.object({
  nome: z.string().min(2, "Informe o nome do produto"),
  descricao: z.string().optional(),
  codigo: z.string().optional(),
  categoriaId: z.string().optional(),
  precoNormal: numeroObrigatorio("Informe um preço válido"),
  precoPromo: numeroOpcional(),
  pesoGramas: numeroOpcional(),
  alturaCm: numeroOpcional(),
  larguraCm: numeroOpcional(),
  profundidadeCm: numeroOpcional(),
  status: z.enum(["ATIVO", "INATIVO", "DESTAQUE"]),
  variacoes: z.array(variacaoSchema).min(1, "Adicione ao menos uma variação"),
});

export type ProdutoFormValues = z.infer<typeof produtoSchema>;

const statusSelectItems = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" },
  { value: "DESTAQUE", label: "Destaque" },
];

function produtoParaFormValues(produto?: ProdutoExistente): ProdutoFormValues {
  if (!produto) {
    return {
      nome: "",
      descricao: "",
      codigo: "",
      categoriaId: undefined,
      precoNormal: "",
      precoPromo: "",
      pesoGramas: "",
      alturaCm: "",
      larguraCm: "",
      profundidadeCm: "",
      status: "ATIVO",
      variacoes: [{ cor: "", tamanho: "", modelo: "", estoque: "0", fotoUrl: "" }],
    };
  }
  return {
    nome: produto.nome,
    descricao: produto.descricao ?? "",
    codigo: produto.codigo ?? "",
    categoriaId: produto.categoriaId ?? undefined,
    precoNormal: String(produto.precoNormal),
    precoPromo: produto.precoPromo != null ? String(produto.precoPromo) : "",
    pesoGramas: produto.pesoGramas != null ? String(produto.pesoGramas) : "",
    alturaCm: produto.alturaCm != null ? String(produto.alturaCm) : "",
    larguraCm: produto.larguraCm != null ? String(produto.larguraCm) : "",
    profundidadeCm: produto.profundidadeCm != null ? String(produto.profundidadeCm) : "",
    status: produto.status,
    variacoes: produto.variacoes.map((v) => {
      const foto = produto.fotos.find((f) => f.id === v.fotoId);
      return {
        id: v.id,
        cor: v.cor ?? "",
        tamanho: v.tamanho ?? "",
        modelo: v.modelo ?? "",
        estoque: String(v.estoque),
        fotoUrl: foto?.url ?? "",
      };
    }),
  };
}

function numeroOuUndefined(valor?: string): number | undefined {
  if (!valor) return undefined;
  const n = Number(valor);
  return Number.isNaN(n) ? undefined : n;
}

export function ProdutoForm({ produto }: { produto?: ProdutoExistente }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const editando = Boolean(produto);
  const { data: loja } = trpc.loja.atual.useQuery();
  const [midias, setMidias] = useState<MidiaProduto[]>(
    produto?.fotos.map((f) => ({ id: f.id, url: f.url, ordem: f.ordem, tipo: f.tipo })) ?? [],
  );

  const criar = trpc.produtos.criar.useMutation();
  const atualizar = trpc.produtos.atualizar.useMutation();

  const form = useForm<ProdutoFormValues>({
    resolver: zodResolver(produtoSchema),
    defaultValues: produtoParaFormValues(produto),
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variacoes",
  });

  async function onSubmit(values: ProdutoFormValues) {
    const payload = {
      nome: values.nome,
      descricao: values.descricao || undefined,
      codigo: values.codigo || undefined,
      categoriaId: values.categoriaId || undefined,
      precoNormal: Number(values.precoNormal),
      precoPromo: numeroOuUndefined(values.precoPromo),
      pesoGramas: numeroOuUndefined(values.pesoGramas),
      alturaCm: numeroOuUndefined(values.alturaCm),
      larguraCm: numeroOuUndefined(values.larguraCm),
      profundidadeCm: numeroOuUndefined(values.profundidadeCm),
      status: values.status,
      fotos: midias.map((m) => ({ id: m.id, url: m.url, ordem: m.ordem, tipo: m.tipo })),
      variacoes: values.variacoes.map((v) => ({
        id: v.id,
        cor: v.cor || undefined,
        tamanho: v.tamanho || undefined,
        modelo: v.modelo || undefined,
        estoque: Number(v.estoque),
        fotoUrl: v.fotoUrl || undefined,
      })),
    };

    try {
      if (editando && produto) {
        await atualizar.mutateAsync({ id: produto.id, ...payload });
      } else {
        await criar.mutateAsync(payload);
      }
      await utils.produtos.listar.invalidate();
      await utils.produtos.buscarPorId.invalidate();
      toast.success(
        editando ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.",
      );
      router.push("/painel/produtos");
    } catch (erro) {
      // FORBIDDEN (ex.: limite de produtos do plano, loja bloqueada) já vem
      // com mensagem clara do servidor — repassa em vez do texto genérico.
      const mensagem =
        erro instanceof TRPCClientError && erro.data?.code === "FORBIDDEN"
          ? erro.message
          : "Não foi possível salvar o produto. Tente novamente.";
      toast.error(mensagem);
    }
  }

  const { data: categorias = [] } = trpc.categorias.listar.useQuery();
  const categoriaSelectItems = categorias.map((categoria) => ({
    value: categoria.id,
    label: categoria.nome,
  }));

  const salvando = criar.isPending || atualizar.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Informações básicas</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Nome do produto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: Camiseta Básica Algodão" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Detalhes do produto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="codigo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código (SKU)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex.: CAM-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoriaId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    items={categoriaSelectItems}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map((categoria) => (
                        <SelectItem key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-medium">Fotos e vídeos</h2>
            <p className="text-muted-foreground text-sm">
              A primeira mídia é usada como capa do produto. Arraste para reordenar.
            </p>
          </div>
          <MidiasProdutoForm lojaId={loja?.id} midias={midias} onChange={setMidias} />
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Preço e status</h2>
          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="precoNormal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço normal (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="precoPromo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço promocional (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormDescription>Opcional</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    items={statusSelectItems}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ATIVO">Ativo</SelectItem>
                      <SelectItem value="INATIVO">Inativo</SelectItem>
                      <SelectItem value="DESTAQUE">Destaque</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Peso e dimensões</h2>
          <div className="grid grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name="pesoGramas"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (g)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alturaCm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Altura (cm)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="larguraCm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Largura (cm)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="profundidadeCm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profundidade (cm)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <Separator />

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Variações e estoque</h2>
              <p className="text-muted-foreground text-sm">
                Cadastre cada combinação de cor/tamanho/modelo com seu estoque inicial.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ cor: "", tamanho: "", modelo: "", estoque: "0", fotoUrl: "" })
              }
            >
              <Plus className="size-4" />
              Adicionar variação
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col gap-3 rounded-lg border p-3">
                <div className="grid grid-cols-[1fr_1fr_1fr_120px_auto] items-start gap-3">
                  <FormField
                    control={form.control}
                    name={`variacoes.${index}.cor`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Cor</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: Preto" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variacoes.${index}.tamanho`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Tamanho</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: M" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variacoes.${index}.modelo`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Modelo</FormLabel>
                        <FormControl>
                          <Input placeholder="Opcional" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`variacoes.${index}.estoque`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Estoque</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-6"
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name={`variacoes.${index}.fotoUrl`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Foto desta variação
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          — mostrada quando o cliente selecionar esta opção
                        </span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => field.onChange("")}
                            className={`text-muted-foreground flex size-28 items-center justify-center rounded-md border text-xs ${
                              !field.value ? "border-foreground border-2" : "border-input"
                            }`}
                          >
                            Sem foto
                          </button>
                          {midias
                            .filter((m) => m.tipo === "IMAGEM")
                            .map((midia) => (
                              // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage
                              <img
                                key={midia.url}
                                src={midia.url}
                                alt="Opção de foto da variação"
                                onClick={() => field.onChange(midia.url)}
                                className={`size-28 cursor-pointer rounded-md border object-cover ${
                                  field.value === midia.url
                                    ? "border-foreground border-2 ring-2 ring-foreground"
                                    : "border-input"
                                }`}
                              />
                            ))}
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>
          {form.formState.errors.variacoes?.root && (
            <p className="text-destructive text-sm">
              {form.formState.errors.variacoes.root.message}
            </p>
          )}
        </section>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/painel/produtos")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {editando ? "Salvar alterações" : "Cadastrar produto"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
