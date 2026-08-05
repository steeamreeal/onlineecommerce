"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";
import { PAPEL_USUARIO_LABEL } from "@/lib/papel-usuario";

const aceitarSchema = z.object({
  nome: z.string().min(2, "Informe seu nome completo"),
  senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
});

export default function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  const { data: convite, isLoading, error: erroConvite } =
    trpc.usuariosLoja.buscarConvitePorToken.useQuery({ token }, { retry: false });
  const aceitarConvite = trpc.usuariosLoja.aceitarConvite.useMutation();

  const form = useForm<z.infer<typeof aceitarSchema>>({
    resolver: zodResolver(aceitarSchema),
    defaultValues: { nome: "", senha: "" },
  });

  async function onSubmit(values: z.infer<typeof aceitarSchema>) {
    if (!convite) return;
    setErro(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: convite.email,
      password: values.senha,
    });

    if (error) {
      setErro(
        error.message.includes("already registered")
          ? "Este e-mail já tem uma conta. Faça login normalmente para aceitar o convite."
          : "Não foi possível criar sua conta. Tente novamente em instantes.",
      );
      return;
    }

    if (!data.user) {
      setErro("Não foi possível criar sua conta. Tente novamente em instantes.");
      return;
    }

    try {
      await aceitarConvite.mutateAsync({ token, nome: values.nome });
    } catch {
      setErro("Sua conta foi criada, mas não foi possível vincular você à loja. Fale com quem te convidou.");
      return;
    }

    router.push("/painel");
    router.refresh();
  }

  if (isLoading) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (erroConvite || !convite) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Convite inválido</CardTitle>
          <CardDescription>
            Este convite não existe, já foi aceito ou expirou. Peça para quem te convidou enviar um
            novo.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Convite para {convite.lojaNome}</CardTitle>
        <CardDescription>
          Você foi convidado como <strong>{PAPEL_USUARIO_LABEL[convite.papel]}</strong>. Crie sua
          senha para aceitar o convite.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {erro && (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <Input value={convite.email} disabled />
            </FormItem>
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="senha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Aceitando..." : "Aceitar convite"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
