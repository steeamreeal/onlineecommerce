"use client";

import { useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2Icon, TriangleAlertIcon } from "lucide-react";

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

const esqueciSenhaSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail").email("E-mail inválido"),
});

export default function EsqueciSenhaPage() {
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const form = useForm<z.infer<typeof esqueciSenhaSchema>>({
    resolver: zodResolver(esqueciSenhaSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: z.infer<typeof esqueciSenhaSchema>) {
    setErro(null);
    const supabase = createClient();

    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });

    // Sempre mostra sucesso, mesmo se o e-mail não existir — evita expor
    // quais e-mails têm conta cadastrada (enumeração de usuários).
    if (error && error.status !== 400) {
      setErro("Não foi possível enviar o e-mail agora. Tente novamente em instantes.");
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2Icon className="text-primary size-5" />
            E-mail enviado
          </CardTitle>
          <CardDescription>
            Se houver uma conta com esse e-mail, enviamos um link para redefinir sua senha. Confira sua caixa de
            entrada (e o spam).
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center text-sm">
          <Link href="/login" className="font-medium hover:underline">
            Voltar para o login
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Esqueci minha senha</CardTitle>
        <CardDescription>Informe seu e-mail para receber um link de redefinição de senha.</CardDescription>
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="voce@exemplo.com" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Enviando..." : "Enviar link de redefinição"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <Link href="/login" className="font-medium hover:underline">
          Voltar para o login
        </Link>
      </CardFooter>
    </Card>
  );
}
