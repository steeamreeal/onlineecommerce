import { MessageCircle } from "lucide-react";
import { configuracaoLojaMock } from "@/lib/mocks/loja";

export function WhatsappFloatButton() {
  const { whatsapp, nome } = configuracaoLojaMock;
  if (!whatsapp) return null;

  const numero = whatsapp.replace(/\D/g, "");
  const mensagem = encodeURIComponent(`Olá! Vim pelo site da ${nome} e gostaria de mais informações.`);

  return (
    <a
      href={`https://wa.me/55${numero}?text=${mensagem}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed right-6 bottom-6 z-40 flex size-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="size-6" />
    </a>
  );
}
