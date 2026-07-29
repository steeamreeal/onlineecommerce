"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LojaForm } from "@/components/dashboard/loja-form";
import { UsuariosLista } from "@/components/dashboard/usuarios-lista";

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Personalize sua loja e gerencie os usuários com acesso ao painel.
        </p>
      </div>

      <Tabs defaultValue="loja" className="flex-1">
        <TabsList>
          <TabsTrigger value="loja">Loja</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="loja">
          <LojaForm />
        </TabsContent>
        <TabsContent value="usuarios">
          <UsuariosLista />
        </TabsContent>
      </Tabs>
    </div>
  );
}
