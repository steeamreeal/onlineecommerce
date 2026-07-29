import Link from "next/link";
import { PartyPopperIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function OnboardingSucessoPage() {
  return (
    <Card className="w-full max-w-sm text-center">
      <CardHeader className="items-center">
        <div className="bg-success/15 text-success mb-2 flex size-12 items-center justify-center rounded-full">
          <PartyPopperIcon className="size-6" />
        </div>
        <CardTitle>Sua loja foi criada!</CardTitle>
        <CardDescription>
          Agora é só cadastrar seus produtos e começar a vender.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button render={<Link href="/painel" />} className="w-full">
          Ir para o painel
        </Button>
      </CardContent>
    </Card>
  );
}
