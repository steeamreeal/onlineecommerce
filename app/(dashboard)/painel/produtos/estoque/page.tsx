import { EstoqueTabs } from "@/components/dashboard/estoque-tabs";

export default function EstoquePage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Estoque</h1>
        <p className="text-muted-foreground text-sm">
          Acompanhe o estoque por variação e o histórico de movimentações.
        </p>
      </div>
      <EstoqueTabs />
    </div>
  );
}
