"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
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
import { createClient } from "@/lib/supabase/client";

const redefinirSenhaSchema = z
  .object({
    senha: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
    confirmarSenha: z.string().min(1, "Confirme sua senha"),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

export default function RedefinirSenhaPage() {
  return (
    <Suspense>
      <RedefinirSenhaForm />
    </Suspense>
  );
}

function RedefinirSenhaForm() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  // O link do e-mail abre a página já com a sessão de recuperação
  // estabelecida via hash da URL (o @supabase/ssr client processa isso
  // sozinho no carregamento) — só liberamos o formulário depois de
  // confirmar que existe uma sessão, senão o updateUser falha sem
  // explicar por quê (link expirado/já usado).
  const [sessaoValida, setSessaoValida] = useState<boolean | null>(null);

  const form = useForm<z.infer<typeof redefinirSenhaSchema>>({
    resolver: zodResolver(redefinirSenhaSchema),
    defaultValues: { senha: "", confirmarSenha: "" },
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessaoValida(Boolean(data.session));
    });
  }, []);

  async function onSubmit(values: z.infer<typeof redefinirSenhaSchema>) {
    setErro(null);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password: values.senha });

    if (error) {
      setErro("Não foi possível redefinir sua senha. Tente novamente em instantes.");
      return;
    }

    router.push("/login");
  }

  if (sessaoValida === null) {
    return null;
  }

  if (!sessaoValida) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Link inválido ou expirado</CardTitle>
          <CardDescription>
            Este link de redefinição de senha não é mais válido. Solicite um novo para continuar.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center text-sm">
          <Link href="/esqueci-senha" className="font-medium hover:underline">
            Solicitar novo link
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
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
            <FormField
              control={form.control}
              name="senha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
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
                  <FormLabel>Confirmar nova senha</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
