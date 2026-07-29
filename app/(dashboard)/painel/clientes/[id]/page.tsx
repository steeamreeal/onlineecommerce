import { notFound } from "next/navigation";
import { ClienteDetalhe } from "@/components/dashboard/cliente-detalhe";
import { clientesMock } from "@/lib/mocks/clientes";

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = clientesMock.find((c) => c.id === id);

  if (!cliente) {
    notFound();
  }

  return <ClienteDetalhe cliente={cliente} />;
}
