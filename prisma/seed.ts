import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const plano = await prisma.plano.upsert({
    where: { id: "seed-plano-pro" },
    update: {},
    create: {
      id: "seed-plano-pro",
      nome: "Pro",
      limiteProdutos: 500,
      limiteUsuarios: 5,
      precoMensal: 129.9,
    },
  });

  const loja = await prisma.loja.upsert({
    where: { slug: "minha-loja" },
    update: {},
    create: {
      nome: "Minha Loja",
      slug: "minha-loja",
      corPrimaria: "#EA580C",
      whatsapp: "(11) 91234-5678",
      instagram: "@minhaloja",
      endereco: "Rua das Flores, 120 - Jardim América, São Paulo/SP",
      horarioAtend: "Seg. a sex., 9h às 18h",
      politicas: "Trocas em até 7 dias após o recebimento, produto sem uso e com etiqueta.",
      planoId: plano.id,
      statusPlano: "ATIVO",
    },
  });

  const categoriaCamisetas = await prisma.categoria.upsert({
    where: { lojaId_nome: { lojaId: loja.id, nome: "Camisetas" } },
    update: {},
    create: { lojaId: loja.id, nome: "Camisetas" },
  });
  const categoriaCalcados = await prisma.categoria.upsert({
    where: { lojaId_nome: { lojaId: loja.id, nome: "Calçados" } },
    update: {},
    create: { lojaId: loja.id, nome: "Calçados" },
  });
  const categoriaAcessorios = await prisma.categoria.upsert({
    where: { lojaId_nome: { lojaId: loja.id, nome: "Acessórios" } },
    update: {},
    create: { lojaId: loja.id, nome: "Acessórios" },
  });
  const categoriaBolsas = await prisma.categoria.upsert({
    where: { lojaId_nome: { lojaId: loja.id, nome: "Bolsas" } },
    update: {},
    create: { lojaId: loja.id, nome: "Bolsas" },
  });

  const produto = await prisma.produto.upsert({
    where: { id: "seed-produto-camiseta" },
    update: {},
    create: {
      id: "seed-produto-camiseta",
      lojaId: loja.id,
      nome: "Camiseta Básica Algodão",
      descricao: "Camiseta 100% algodão, corte reto, gola redonda.",
      codigo: "CAM-001",
      precoNormal: 79.9,
      precoPromo: 59.9,
      pesoGramas: 200,
      status: "DESTAQUE",
      categoriaId: categoriaCamisetas.id,
      fotos: { create: [{ url: "/mocks/camiseta.jpg", ordem: 0 }] },
      variacoes: {
        create: [
          { id: "seed-var-camiseta-preto-p", cor: "Preto", tamanho: "P", estoque: 12 },
          { id: "seed-var-camiseta-preto-m", cor: "Preto", tamanho: "M", estoque: 3 },
          { id: "seed-var-camiseta-branco-m", cor: "Branco", tamanho: "M", estoque: 0 },
        ],
      },
    },
    include: { variacoes: true },
  });

  await prisma.produto.upsert({
    where: { id: "seed-produto-tenis" },
    update: {},
    create: {
      id: "seed-produto-tenis",
      lojaId: loja.id,
      nome: "Tênis Runner Pro",
      descricao: "Tênis para corrida com amortecimento em gel.",
      codigo: "TEN-014",
      precoNormal: 349.9,
      pesoGramas: 800,
      status: "ATIVO",
      categoriaId: categoriaCalcados.id,
      fotos: { create: [{ url: "/mocks/tenis.jpg", ordem: 0 }] },
      variacoes: {
        create: [
          { id: "seed-var-tenis-azul-40", cor: "Azul", tamanho: "40", estoque: 4 },
          { id: "seed-var-tenis-azul-42", cor: "Azul", tamanho: "42", estoque: 8 },
        ],
      },
    },
    include: { variacoes: true },
  });

  await prisma.produto.upsert({
    where: { id: "seed-produto-bone" },
    update: {},
    create: {
      id: "seed-produto-bone",
      lojaId: loja.id,
      nome: "Boné Aba Curva",
      codigo: "BON-007",
      precoNormal: 59.9,
      status: "INATIVO",
      categoriaId: categoriaAcessorios.id,
      variacoes: { create: [{ modelo: "Único", estoque: 20 }] },
    },
  });

  await prisma.produto.upsert({
    where: { id: "seed-produto-bolsa" },
    update: {},
    create: {
      id: "seed-produto-bolsa",
      lojaId: loja.id,
      nome: "Bolsa Transversal Couro Sintético",
      descricao: "Bolsa transversal com alça ajustável.",
      codigo: "BOL-022",
      precoNormal: 129.9,
      precoPromo: 99.9,
      status: "ATIVO",
      categoriaId: categoriaBolsas.id,
      fotos: { create: [{ url: "/mocks/bolsa.jpg", ordem: 0 }] },
      variacoes: {
        create: [
          { id: "seed-var-bolsa-caramelo", cor: "Caramelo", estoque: 2 },
          { id: "seed-var-bolsa-preto", cor: "Preto", estoque: 15 },
        ],
      },
    },
    include: { variacoes: true },
  });

  const movimentosSeed = [
    {
      id: "seed-mov-1",
      variacaoId: "seed-var-camiseta-preto-m",
      quantidade: 20,
      tipo: "ENTRADA" as const,
      motivo: "Compra de fornecedor",
    },
    {
      id: "seed-mov-2",
      variacaoId: "seed-var-camiseta-preto-m",
      quantidade: 17,
      tipo: "SAIDA" as const,
      motivo: "Venda #1042",
    },
    {
      id: "seed-mov-3",
      variacaoId: "seed-var-camiseta-branco-m",
      quantidade: 10,
      tipo: "SAIDA" as const,
      motivo: "Venda #1055",
    },
    {
      id: "seed-mov-4",
      variacaoId: "seed-var-tenis-azul-40",
      quantidade: 12,
      tipo: "ENTRADA" as const,
      motivo: "Compra de fornecedor",
    },
    {
      id: "seed-mov-5",
      variacaoId: "seed-var-tenis-azul-40",
      quantidade: 8,
      tipo: "SAIDA" as const,
      motivo: "Venda #1061",
    },
    {
      id: "seed-mov-6",
      variacaoId: "seed-var-bolsa-caramelo",
      quantidade: 5,
      tipo: "ENTRADA" as const,
      motivo: "Ajuste de inventário",
    },
  ];

  for (const mov of movimentosSeed) {
    await prisma.movimentoEstoque.upsert({
      where: { id: mov.id },
      update: {},
      create: mov,
    });
  }

  const variacaoPedido = produto.variacoes[0];

  const cliente = await prisma.cliente.upsert({
    where: { id: "seed-cliente-ana" },
    update: {},
    create: {
      id: "seed-cliente-ana",
      lojaId: loja.id,
      nome: "Ana Beatriz Souza",
      telefone: "(11) 98888-1234",
      email: "ana.souza@email.com",
      documento: "123.456.789-00",
      enderecos: {
        create: [
          {
            rua: "Rua das Flores",
            numero: "120",
            bairro: "Jardim América",
            cidade: "São Paulo",
            estado: "SP",
            cep: "01234-000",
            principal: true,
          },
        ],
      },
    },
  });

  await prisma.pedido.upsert({
    where: { id: "seed-pedido-exemplo" },
    update: {},
    create: {
      id: "seed-pedido-exemplo",
      lojaId: loja.id,
      clienteId: cliente.id,
      status: "PAGO",
      formaPagamento: "PIX",
      valorFrete: 15,
      valorDesconto: 0,
      valorTotal: 74.9,
      itens: {
        create: [
          {
            produtoId: produto.id,
            variacaoId: variacaoPedido.id,
            quantidade: 1,
            precoUnit: 59.9,
          },
        ],
      },
    },
  });

  console.log("Seed concluído:", { loja: loja.nome, produto: produto.nome, cliente: cliente.nome });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
