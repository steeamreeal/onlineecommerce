import { notFound } from "next/navigation";
import { LojaDetalhe } from "@/components/admin/loja-detalhe";
import { lojasMock } from "@/lib/mocks/lojas";

export default async function AdminLojaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loja = lojasMock.find((l) => l.id === id);

  if (!loja) {
    notFound();
  }

  return <LojaDetalhe loja={loja} />;
}
