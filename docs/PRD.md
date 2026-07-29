# PRD — Online E-commerce (SaaS Multi-loja)

## 1. Contexto e problema

Empresa com dificuldade de vender on-line: só tem loja física e não tem loja on-line, não tem controle de estoque, não tem um sistema de colocar os produtos e subir para o site automaticamente. Precisa ficar respondendo no WhatsApp porque não tem site, mandando tamanho e valores tudo no manual pelo WhatsApp.

Perde clientes para concorrentes que oferecem compra rápida pelo site. Fica limitado aos clientes da própria cidade ou das redes sociais. O cliente desiste porque demora para receber resposta. Os pedidos ficam desorganizados em conversas. O lojista perde tempo atendendo manualmente e perde vendas porque o cliente não consegue comprar sozinho, de forma rápida e a qualquer horário.

## 2. Solução proposta

Permitir que qualquer lojista crie sua loja virtual, cadastre produtos, receba pedidos e gerencie toda a operação em um único sistema. Cria um site onde o cliente consegue consultar os produtos e comprar sozinho — as vendas podem acontecer 24 horas por dia, mesmo quando ninguém está atendendo.

O sistema centraliza todos os pedidos, mostrando pagamento, produtos, cliente, endereço e situação da entrega; atualiza o estoque automaticamente quando uma venda é realizada; cria a loja virtual automaticamente a partir das informações cadastradas no painel. O cliente escolhe os produtos, informa os dados, seleciona pagamento e entrega e finaliza o pedido diretamente no site.

Site próprio, vendas automáticas, pedidos centralizados, estoque atualizado, pagamentos integrados e gestão completa em um único painel.

Transformamos lojas que vendem manualmente pelas redes sociais em operações digitais organizadas, profissionais e disponíveis para vender 24 horas por dia.

O comerciante consegue criar a loja dele do jeito que ele quiser e acha melhor.

## 3. Requisitos funcionais

Requisitos transversais:
- Login e autenticação
- Kanban
- Dashboards
- Multi usuário
- Multi empresa
- Permissões por usuário
- Notificações
- Relatórios e exportação
- Upload de arquivos
- Busca e filtros
- Onboarding do usuário

### 3.1 Criação automática da loja virtual
O lojista cria a conta, escolhe um modelo, coloca logo, cores e informações da empresa, e o sistema gera o site de vendas automaticamente.

### 3.2 Cadastro e gestão de produtos
- Nome e descrição
- Fotos
- Preço normal e promocional
- Categorias
- Estoque
- Código do produto
- Peso e dimensões
- Variações de cor, tamanho e modelo
- Produto ativo, inativo ou em destaque

### 3.3 Site de vendas
O cliente poderá:
- Ver os produtos
- Pesquisar
- Filtrar por categoria e preço
- Abrir a página do produto
- Escolher variações
- Adicionar ao carrinho
- Finalizar a compra
- Pagar pelo site

### 3.4 Carrinho e checkout
- Resumo do pedido
- Cadastro do cliente
- Endereço de entrega
- Cupom de desconto
- Escolha de frete
- Retirada na loja
- Forma de pagamento
- Confirmação do pedido

### 3.5 Pagamentos integrados
- PIX
- Cartão de crédito
- Boleto
- Link de pagamento
- Pagamento na entrega
- Confirmação automática de pagamento

### 3.6 Gestão de pedidos
Status: Novo pedido → Aguardando pagamento → Pago → Em preparação → Enviado → Pronto para retirada → Entregue → Cancelado.

Também terá histórico, comprovantes, rastreio e contato com o cliente pelo WhatsApp.

### 3.7 Controle de estoque
- Baixa automática após a venda
- Estoque por variação
- Aviso de estoque baixo
- Bloqueio de venda sem estoque
- Histórico de entradas e saídas

### 3.8 Cadastro de clientes
- Nome, telefone, e-mail, CPF ou CNPJ
- Endereços
- Histórico de compras
- Total gasto
- Ticket médio
- Última compra

### 3.9 Frete e entrega
- Retirada na loja
- Entrega própria
- Taxa por bairro
- Taxa por cidade
- Frete fixo
- Frete grátis por valor mínimo
- Correios e transportadoras
- Código de rastreio

### 3.10 Cupons e promoções
- Cupom percentual
- Desconto em valor fixo
- Frete grátis
- Promoções por produto ou categoria
- Data de início e término
- Limite de uso

### 3.11 Dashboard
- Faturamento
- Número de pedidos
- Ticket médio
- Produtos mais vendidos
- Clientes que mais compram
- Pedidos pendentes
- Estoque baixo
- Vendas por período

### 3.12 Personalização da loja
- Logo, cores, banners
- Redes sociais
- WhatsApp
- Endereço
- Horário de atendimento
- Políticas da loja
- Domínio personalizado

### 3.13 Usuários e permissões
O lojista poderá cadastrar funcionários e limitar o acesso de cada um: Administrador, Gerente, Vendedor, Estoquista, Separador de pedidos.

### 3.14 Integração com WhatsApp
- Botão no site
- Confirmação de pedido
- Atualização de status
- Recuperação de carrinho
- Avisos de pagamento
- Link direto para atendimento

### 3.15 Painel administrativo do SaaS
Para o dono da plataforma:
- Cadastro de lojas
- Planos e assinaturas
- Controle de pagamentos
- Bloqueio ou liberação de clientes
- Limites por plano
- Métricas gerais
- Gestão de usuários
- Suporte

## 4. Personas

- **Lojista** — pequeno/médio comerciante, dono(a) de loja física, online ou híbrida, que hoje vende principalmente pelo WhatsApp e Instagram.
- **Cliente final** — pessoa que quer comprar da loja ou já é cliente fiel do lojista.

## 5. Stack técnica

- Next.js
- React
- shadcn/ui
- Supabase
- Stripe
- Vercel
- Claude Code
- Node.js
- TypeScript
- PostgreSQL
- Prisma
- tRPC
- Resend (e-mails)
- Tailwind CSS

## 6. Linguagem de design

Design moderno e simples, fácil de usar mesmo sem experiência técnica, para o lojista conseguir cadastrar produtos e configurar a loja física/online sem dificuldade.

Referências:
- https://shopee.com.br/
- https://www.shopify.com/
- https://www.mercadolivre.com.br/
- https://www.godaddy.com/
- https://www.nuvemshop.com.br/loja-virtual

## 7. Processo

- Dividir a construção do app em marcos lógicos (etapas)
- Cada marco deve ser um incremento entregável
- Priorizar funcionalidade core primeiro, depois iterar
- Testar cada marco antes de avançar para o próximo
