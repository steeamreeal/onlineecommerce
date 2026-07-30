"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
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
import { TriangleAlertIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { trpc } from "@/lib/trpc/client";

const cadastroSchema = z
  .object({
    nome: z.string().min(2, "Informe seu nome completo"),
    email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
    senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmarSenha: z.string().min(1, "Confirme sua senha"),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

export default function CadastroPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const sincronizarUsuario = trpc.auth.sincronizarUsuario.useMutation();
  const form = useForm<z.infer<typeof cadastroSchema>>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { nome: "", email: "", senha: "", confirmarSenha: "" },
  });

  async function onSubmit(values: z.infer<typeof cadastroSchema>) {
    setErro(null);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.senha,
    });

    if (error) {
      setErro(
        error.message.includes("already registered")
          ? "Este e-mail já está cadastrado. Tente entrar na sua conta."
          : "Não foi possível criar sua conta. Tente novamente em instantes.",
      );
      return;
    }

    if (!data.user) {
      setErro("Não foi possível criar sua conta. Tente novamente em instantes.");
      return;
    }

    try {
      await sincronizarUsuario.mutateAsync({ nome: values.nome });
    } catch {
      setErro("Sua conta foi criada, mas houve um problema ao configurar seu perfil. Fale com o suporte.");
      return;
    }

    router.push("/onboarding");
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Criar sua conta</CardTitle>
        <CardDescription>
          Comece a vender online em poucos minutos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {erro && (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Seu nome"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="voce@exemplo.com"
                      autoComplete="email"
                      {...field}
                    />
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
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmarSenha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar senha</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Criando conta..." : "Criar conta"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <span className="text-muted-foreground">Já tem uma conta?</span>
        <Link href="/login" className="ml-1 font-medium hover:underline">
          Entrar
        </Link>
      </CardFooter>
    </Card>
  );
}
