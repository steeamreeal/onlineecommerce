import { LojaDetalhe } from "@/components/admin/loja-detalhe";

export default async function AdminLojaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LojaDetalhe lojaId={id} />;
}
