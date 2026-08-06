type TipoMidia = "IMAGEM" | "VIDEO";
type Banner = {
  url: string;
  titulo?: string;
  tipo?: TipoMidia;
  urlMobile?: string;
  tipoMobile?: TipoMidia;
};

function Midia({
  url,
  tipo,
  titulo,
  className,
}: {
  url: string;
  tipo: TipoMidia;
  titulo?: string;
  className: string;
}) {
  if (tipo === "VIDEO") {
    return <video src={url} className={className} autoPlay muted loop playsInline />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- URL dinâmica do Supabase Storage, sem domínio fixo para next/image
    <img src={url} alt={titulo ?? ""} className={className} />
  );
}

/**
 * Renderiza a mídia (imagem ou vídeo) de um banner, alternando entre a
 * versão mobile e desktop por breakpoint quando o lojista enviou as duas —
 * cai para a versão desktop em ambas as telas quando só existe uma.
 *
 * `viewport` força qual versão exibir independente da largura real da
 * janela — usado só pelo preview do editor de tema, para simular mobile
 * mesmo com o painel aberto numa tela grande. No site público fica
 * undefined e a escolha volta a ser 100% por CSS responsivo (md:).
 */
export function BannerMidia({
  banner,
  viewport,
}: {
  banner: Banner | undefined;
  viewport?: "DESKTOP" | "MOBILE";
}) {
  if (!banner?.url) return null;

  const temMobile = Boolean(banner.urlMobile);
  const classeBase = "absolute inset-0 size-full object-cover";

  if (viewport === "MOBILE") {
    return (
      <Midia
        url={banner.urlMobile ?? banner.url}
        tipo={(temMobile ? banner.tipoMobile : banner.tipo) ?? "IMAGEM"}
        titulo={banner.titulo}
        className={classeBase}
      />
    );
  }

  if (viewport === "DESKTOP") {
    return (
      <Midia
        url={banner.url}
        tipo={banner.tipo ?? "IMAGEM"}
        titulo={banner.titulo}
        className={classeBase}
      />
    );
  }

  return (
    <>
      <Midia
        url={banner.urlMobile ?? banner.url}
        tipo={(temMobile ? banner.tipoMobile : banner.tipo) ?? "IMAGEM"}
        titulo={banner.titulo}
        className={temMobile ? `${classeBase} md:hidden` : classeBase}
      />
      {temMobile && (
        <Midia
          url={banner.url}
          tipo={banner.tipo ?? "IMAGEM"}
          titulo={banner.titulo}
          className={`${classeBase} hidden md:block`}
        />
      )}
    </>
  );
}
