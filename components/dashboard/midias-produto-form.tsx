"use client";

import { useState } from "react";
import { GripVertical, Upload, Video, X } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { enviarFotoProduto, enviarVideoProduto } from "@/lib/supabase/storage";

export type MidiaProduto = { id?: string; url: string; ordem: number; tipo: "IMAGEM" | "VIDEO" };

function chaveMidia(midia: MidiaProduto): string {
  return midia.id ?? midia.url;
}

function CartaoMidia({
  midia,
  index,
  onRemover,
}: {
  midia: MidiaProduto;
  index: number;
  onRemover: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chaveMidia(midia),
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="group relative aspect-4/3 w-40 touch-none"
    >
      {midia.tipo === "VIDEO" ? (
        <video src={midia.url} className="size-full rounded-md border object-cover" muted />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
        <img
          src={midia.url}
          alt={`Mídia ${index + 1}`}
          className="size-full rounded-md border object-cover"
        />
      )}

      {midia.tipo === "VIDEO" && (
        <span className="bg-background/90 absolute bottom-1 left-1 rounded-full p-1">
          <Video className="size-3" />
        </span>
      )}

      <button
        type="button"
        {...attributes}
        {...listeners}
        className="bg-background/90 absolute top-1 left-1 cursor-grab touch-none rounded-full p-1 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="size-3" />
      </button>

      <button
        type="button"
        onClick={onRemover}
        className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 rounded-full p-1"
        aria-label="Remover mídia"
      >
        <X className="size-3" />
      </button>

      {index === 0 && (
        <span className="bg-foreground text-background absolute bottom-1 right-1 rounded px-1 text-[10px] font-medium">
          Capa
        </span>
      )}
    </div>
  );
}

/**
 * Grade de fotos/vídeos do produto com reordenação por arrastar (@dnd-kit) —
 * a primeira mídia da lista vira a capa do produto. Fotos e vídeos convivem
 * na mesma lista/ordem (mesmo padrão dos banners da home: imagem ou vídeo).
 */
export function MidiasProdutoForm({
  lojaId,
  midias,
  onChange,
}: {
  lojaId: string | undefined;
  midias: MidiaProduto[];
  onChange: (midias: MidiaProduto[]) => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo || !lojaId) return;

    const ehVideo = arquivo.type.startsWith("video/");
    setEnviando(true);
    try {
      const url = ehVideo
        ? await enviarVideoProduto(lojaId, arquivo)
        : await enviarFotoProduto(lojaId, arquivo);
      onChange([...midias, { url, ordem: midias.length, tipo: ehVideo ? "VIDEO" : "IMAGEM" }]);
    } catch (error) {
      const mensagem =
        error instanceof Error && error.message
          ? error.message
          : "Não foi possível enviar o arquivo. Tente novamente.";
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  function removerMidia(index: number) {
    onChange(midias.filter((_, i) => i !== index).map((midia, i) => ({ ...midia, ordem: i })));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const indiceAtivo = midias.findIndex((m) => chaveMidia(m) === active.id);
    const indiceDestino = midias.findIndex((m) => chaveMidia(m) === over.id);
    if (indiceAtivo === -1 || indiceDestino === -1) return;

    const reordenadas = arrayMove(midias, indiceAtivo, indiceDestino).map((midia, i) => ({
      ...midia,
      ordem: i,
    }));
    onChange(reordenadas);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={midias.map(chaveMidia)} strategy={rectSortingStrategy}>
          {midias.map((midia, index) => (
            <CartaoMidia
              key={chaveMidia(midia)}
              midia={midia}
              index={index}
              onRemover={() => removerMidia(index)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <label className="border-input hover:bg-accent flex aspect-4/3 w-40 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs has-disabled:pointer-events-none has-disabled:opacity-50">
        <Upload className="size-4" />
        {enviando ? "Enviando..." : "Adicionar"}
        <input
          type="file"
          accept="image/*,video/mp4,video/webm"
          className="hidden"
          disabled={enviando || !lojaId}
          onChange={handleUpload}
        />
      </label>
    </div>
  );
}
