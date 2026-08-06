import { Inter, Poppins, Playfair_Display, Merriweather, Montserrat, DM_Sans } from "next/font/google";

// Carrega as 6 fontes de FONTES_TEMA (lib/tema-loja.ts) de uma vez, cada
// uma numa CSS var própria — permite que qualquer texto da loja (título e
// botão do banner, por exemplo) troque de fonte via
// style={{ fontFamily: FONTE_CSS_VAR[fonte] }} sem precisar de um import
// estático por página. Usado tanto no site público quanto no preview do
// editor de tema (dashboard), que reaproveita o mesmo ThemeRenderer.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" });
const playfairDisplay = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair-display" });
const merriweather = Merriweather({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-merriweather" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const CLASSE_FONTES_TEMA = [
  inter.variable,
  poppins.variable,
  playfairDisplay.variable,
  merriweather.variable,
  montserrat.variable,
  dmSans.variable,
].join(" ");
