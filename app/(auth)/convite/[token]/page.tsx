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

// E-mail já tem conta (ex.: já é dono de outra loja e foi convidado para
// mais uma - UsuarioLoja permite N lojas por login) - só pede a senha e
// entra, sem tentar criar conta de novo.
const loginSchema = z.object({
  senha: z.string().min(1, "Informe sua senha"),
});

export default function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  // "cadastro": primeira vez, cria conta. "login": e-mail já tem conta em
  // outra loja - detectado pelo erro "already registered" do signUp.
  const [modo, setModo] = useState<"cadastro" | "login">("cadastro");

  const { data: convite, isLoading, error: erroConvite } =
    trpc.usuariosLoja.buscarConvitePorToken.useQuery({ token }, { retry: false });
  const aceitarConvite = trpc.usuariosLoja.aceitarConvite.useMutation();

  const form = useForm<z.infer<typeof aceitarSchema>>({
    resolver: zodResolver(aceitarSchema),
    defaultValues: { nome: "", senha: "" },
  });

  const formLogin = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { senha: "" },
  });

  async function finalizarAceite(nome: string) {
    let resultado;
    try {
      resultado = await aceitarConvite.mutateAsync({ token, nome });
    } catch {
      setErro("Não foi possível vincular você à loja. Fale com quem te convidou.");
      return;
    }

    // Se o e-mail já tinha outra loja ativa (cookie loja_ativa apontando
    // para ela), a loja recém-aceita precisa virar a ativa - senão o painel
    // abre na loja antiga em vez da que o convite era para.
    await fetch("/api/loja-ativa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lojaId: resultado.lojaId }),
    }).catch(() => {});

    router.push("/painel");
    router.refresh();
  }

  async function onSubmit(values: z.infer<typeof aceitarSchema>) {
    if (!convite) return;
    setErro(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: convite.email,
      password: values.senha,
    });

    if (error) {
      if (error.message.includes("already registered")) {
        setModo("login");
        return;
      }
      setErro("Não foi possível criar sua conta. Tente novamente em instantes.");
      return;
    }

    if (!data.user) {
      setErro("Não foi possível criar sua conta. Tente novamente em instantes.");
      return;
    }

    await finalizarAceite(values.nome);
  }

  async function onSubmitLogin(values: z.infer<typeof loginSchema>) {
    if (!convite) return;
    setErro(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: convite.email,
      password: values.senha,
    });

    if (error || !data.user) {
      setErro("Senha incorreta. Tente novamente.");
      return;
    }

    await finalizarAceite(data.user.user_metadata?.nome ?? convite.email);
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
          {modo === "cadastro" ? (
            <>
              Você foi convidado como <strong>{PAPEL_USUARIO_LABEL[convite.papel]}</strong>. Crie sua
              senha para aceitar o convite.
            </>
          ) : (
            <>
              Este e-mail já tem uma conta na plataforma. Entre com sua senha para aceitar o convite
              como <strong>{PAPEL_USUARIO_LABEL[convite.papel]}</strong> em {convite.lojaNome}.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {modo === "cadastro" ? (
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
        ) : (
          <Form {...formLogin}>
            <form onSubmit={formLogin.handleSubmit(onSubmitLogin)} className="flex flex-col gap-4">
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
                control={formLogin.control}
                name="senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={formLogin.formState.isSubmitting}>
                {formLogin.formState.isSubmitting ? "Entrando..." : "Entrar e aceitar convite"}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
