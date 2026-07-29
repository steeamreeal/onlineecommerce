"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BellIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";

const STATUS_PEDIDO = [
  { label: "Novo", className: "bg-accent text-accent-foreground" },
  { label: "Aguardando pagamento", className: "bg-warning/15 text-warning-foreground" },
  { label: "Pago", className: "bg-success/15 text-success" },
  { label: "Em preparação", className: "bg-accent text-accent-foreground" },
  { label: "Enviado", className: "bg-primary/15 text-primary" },
  { label: "Pronto para retirada", className: "bg-primary/15 text-primary" },
  { label: "Entregue", className: "bg-success/15 text-success" },
  { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-4 rounded-lg border p-6">
        {children}
      </div>
    </section>
  );
}

const exemploFormSchema = z.object({
  nome: z.string().min(2, "Informe pelo menos 2 caracteres"),
});

function ExemploForm() {
  const form = useForm<z.infer<typeof exemploFormSchema>>({
    resolver: zodResolver(exemploFormSchema),
    defaultValues: { nome: "" },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(() => {})}
        className="flex max-w-sm flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do produto</FormLabel>
              <FormControl>
                <Input placeholder="Ex.: Camiseta básica" {...field} />
              </FormControl>
              <FormDescription>Aparece na página do produto.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-fit">
          Salvar
        </Button>
      </form>
    </Form>
  );
}

export default function DevUiPage() {
  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-10 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Design system — showcase</h1>
        <p className="text-muted-foreground">
          Vitrine interna dos componentes base. Não expor em produção (ver M17).
        </p>
      </div>

      <Section title="Cores">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["primary", "bg-primary text-primary-foreground"],
            ["secondary", "bg-secondary text-secondary-foreground"],
            ["success", "bg-success text-success-foreground"],
            ["warning", "bg-warning text-warning-foreground"],
            ["destructive", "bg-destructive text-white"],
            ["muted", "bg-muted text-muted-foreground"],
            ["accent", "bg-accent text-accent-foreground"],
          ].map(([name, cls]) => (
            <div
              key={name}
              className={`flex h-16 items-center justify-center rounded-md text-sm font-medium ${cls}`}
            >
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Default</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Section>

      <Section title="Badge — status de pedido (PRD 3.6)">
        <div className="flex flex-wrap gap-2">
          {STATUS_PEDIDO.map((s) => (
            <Badge key={s.label} className={s.className}>
              {s.label}
            </Badge>
          ))}
        </div>
      </Section>

      <Section title="Input / Label / Form">
        <div className="flex max-w-sm flex-col gap-2">
          <Label htmlFor="exemplo-input">Nome do cliente</Label>
          <Input id="exemplo-input" placeholder="Digite o nome" />
        </div>
        <div className="flex max-w-sm flex-col gap-2">
          <Label htmlFor="exemplo-disabled">Campo desabilitado</Label>
          <Input id="exemplo-disabled" disabled placeholder="Não editável" />
        </div>
        <ExemploForm />
      </Section>

      <Section title="Select">
        <Select defaultValue="ativo">
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
            <SelectItem value="destaque">Destaque</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section title="Card">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Produtos mais vendidos</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Conteúdo de exemplo para o card.
            </p>
          </CardContent>
        </Card>
      </Section>

      <Section title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>#1032</TableCell>
              <TableCell>Maria Souza</TableCell>
              <TableCell>
                <Badge className={STATUS_PEDIDO[2].className}>Pago</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>#1033</TableCell>
              <TableCell>João Lima</TableCell>
              <TableCell>
                <Badge className={STATUS_PEDIDO[1].className}>
                  Aguardando pagamento
                </Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="dados">
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="variacoes">Variações</TabsTrigger>
            <TabsTrigger value="estoque">Estoque</TabsTrigger>
          </TabsList>
          <TabsContent value="dados">Conteúdo da aba Dados.</TabsContent>
          <TabsContent value="variacoes">Conteúdo da aba Variações.</TabsContent>
          <TabsContent value="estoque">Conteúdo da aba Estoque.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Dialog / Sheet">
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger render={<Button variant="outline" />}>
              Abrir dialog
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Excluir produto</DialogTitle>
                <DialogDescription>
                  Essa ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button variant="destructive">Excluir</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger render={<Button variant="outline" />}>
              Abrir sheet
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
                <SheetDescription>
                  Filtre produtos por categoria e status.
                </SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </div>
      </Section>

      <Section title="Dropdown menu">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Ações
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Editar</DropdownMenuItem>
            <DropdownMenuItem>Duplicar</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      <Section title="Avatar">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="" alt="" />
            <AvatarFallback>LR</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>LG</AvatarFallback>
          </Avatar>
        </div>
      </Section>

      <Section title="Alert">
        <Alert>
          <InfoIcon />
          <AlertTitle>Estoque atualizado</AlertTitle>
          <AlertDescription>
            O estoque foi recalculado após a última venda.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>Falha ao processar pagamento</AlertTitle>
          <AlertDescription>
            Tente novamente ou escolha outra forma de pagamento.
          </AlertDescription>
        </Alert>
      </Section>

      <Section title="Tooltip">
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="icon" />}>
            <BellIcon />
          </TooltipTrigger>
          <TooltipContent>Notificações</TooltipContent>
        </Tooltip>
      </Section>

      <Section title="Skeleton">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Section>

      <Section title="Separator">
        <div>
          <p className="text-sm">Seção A</p>
          <Separator className="my-3" />
          <p className="text-sm">Seção B</p>
        </div>
      </Section>

      <Section title="Pagination">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Section>
    </main>
  );
}
