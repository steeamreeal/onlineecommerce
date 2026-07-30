"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

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
import { enviarFotoProduto } from "@/lib/supabase/storage";
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

type Foto = { id?: string; url: string; ordem: number };

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
      variacoes: [{ cor: "", tamanho: "", modelo: "", estoque: "0" }],
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
    variacoes: produto.variacoes.map((v) => ({
      id: v.id,
      cor: v.cor ?? "",
      tamanho: v.tamanho ?? "",
      modelo: v.modelo ?? "",
      estoque: String(v.estoque),
    })),
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
  const [fotos, setFotos] = useState<Foto[]>(
    produto?.fotos.map((f) => ({ id: f.id, url: f.url, ordem: f.ordem })) ?? [],
  );
  const [enviandoFoto, setEnviandoFoto] = useState(false);

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

  async function handleUploadFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !loja) return;

    setEnviandoFoto(true);
    try {
      const url = await enviarFotoProduto(loja.id, arquivo);
      setFotos((atual) => [...atual, { url, ordem: atual.length }]);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível enviar a foto. Tente novamente.";
      toast.error(mensagem);
    } finally {
      setEnviandoFoto(false);
    }
  }

  function removerFoto(index: number) {
    setFotos((atual) =>
      atual.filter((_, i) => i !== index).map((foto, i) => ({ ...foto, ordem: i })),
    );
  }

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
      fotos: fotos.map((f) => ({ id: f.id, url: f.url, ordem: f.ordem })),
      variacoes: values.variacoes.map((v) => ({
        id: v.id,
        cor: v.cor || undefined,
        tamanho: v.tamanho || undefined,
        modelo: v.modelo || undefined,
        estoque: Number(v.estoque),
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
    } catch {
      toast.error("Não foi possível salvar o produto. Tente novamente.");
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
            <h2 className="text-lg font-medium">Fotos</h2>
            <p className="text-muted-foreground text-sm">
              A primeira foto é usada como capa do produto.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {fotos.map((foto, index) => (
              <div key={foto.id ?? foto.url} className="relative size-24">
                {/* eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image */}
                <img
                  src={foto.url}
                  alt={`Foto ${index + 1}`}
                  className="size-24 rounded-md border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removerFoto(index)}
                  className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 rounded-full p-1"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
            <label className="border-input hover:bg-accent flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs has-disabled:pointer-events-none has-disabled:opacity-50">
              <Upload className="size-4" />
              {enviandoFoto ? "Enviando..." : "Adicionar"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={enviandoFoto || !loja}
                onChange={handleUploadFoto}
              />
            </label>
          </div>
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
              onClick={() => append({ cor: "", tamanho: "", modelo: "", estoque: "0" })}
            >
              <Plus className="size-4" />
              Adicionar variação
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-[1fr_1fr_1fr_120px_auto] items-start gap-3 rounded-lg border p-3"
              >
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
