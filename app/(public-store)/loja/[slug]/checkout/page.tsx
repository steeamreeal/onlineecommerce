import { CheckoutWizard } from "@/components/store/checkout-wizard";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <CheckoutWizard slug={slug} />;
}
