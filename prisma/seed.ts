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

  const categoria = await prisma.categoria.upsert({
    where: { lojaId_nome: { lojaId: loja.id, nome: "Camisetas" } },
    update: {},
    create: { lojaId: loja.id, nome: "Camisetas" },
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
      categoriaId: categoria.id,
      fotos: { create: [{ url: "/mocks/camiseta.jpg", ordem: 0 }] },
      variacoes: {
        create: [
          { cor: "Preto", tamanho: "P", estoque: 12 },
          { cor: "Preto", tamanho: "M", estoque: 3 },
          { cor: "Branco", tamanho: "M", estoque: 0 },
        ],
      },
    },
    include: { variacoes: true },
  });

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
