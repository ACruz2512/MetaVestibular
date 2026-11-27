# Meta Vestibular — versão integrada

## Como abrir

1. Extraia todo o conteúdo do ZIP para uma pasta.
2. Abra `index.html` no navegador ou publique a pasta em um servidor estático.
3. Para testar localmente com um servidor, execute `python -m http.server 8000` dentro desta pasta e acesse `http://localhost:8000`.

## Recursos integrados

- Página inicial do dashboard com acessos rápidos, atividades, artigos e painel lateral.
- Navegação para Início, Questões, Materiais didáticos, Livros, Meu Progresso, Destaques e Configurações.
- Modo claro/escuro salvo no navegador e compartilhado entre as páginas.
- Progresso da página inicial calculado a partir do mesmo histórico de respostas usado em Meu Progresso.
- Banco de questões, correção, explicações, tentativas e restauração das respostas.
- Destaques/favoritos salvos localmente.
- Configurações de nome, meta diária, alto contraste e redução de animações.
- Busca que encaminha para os resultados de questões e filtros nas páginas que possuem catálogos.
- Sidebar horizontal e rolável em telas menores, sem comprimir o conteúdo em uma coluna estreita.

## Login

- `login.html` tem as abas Entrar e Criar conta; todas as outras páginas redirecionam para ela quando não há sessão (`auth.js`).
- As contas ficam no `localStorage` do navegador (senha com PBKDF2 + salt). Não há servidor: isso separa o progresso, os destaques e as configurações por usuário, mas **não é segurança real** e não sincroniza entre dispositivos.
- O primeiro cadastro herda o progresso que já existia no navegador antes do login.
- O botão de sair fica no header, ao lado do perfil.

## Banco de dados na nuvem (Supabase)

Com o `config.js` vazio, o site usa o login local descrito acima. Para as contas e os dados funcionarem em qualquer dispositivo, mesmo com o site no GitHub Pages:

1. Crie um projeto gratuito em https://supabase.com.
2. No projeto, abra **SQL Editor**, cole todo o conteúdo de `supabase-setup.sql` e clique em **Run**. Isso cria a tabela `user_data` com a regra de que cada usuário só acessa os próprios dados.
3. Em **Authentication > Providers > Email**, desative **Confirm email** (senão cada cadastro precisa ser confirmado por e-mail antes do primeiro login).
4. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public** e coloque em `config.js`.
5. Em **Authentication > URL Configuration**, coloque o endereço do seu GitHub Pages em **Site URL**.
6. Publique a pasta no GitHub Pages.

A chave `anon` pode ficar no código do site: ela é pública por projeto, e a segurança vem das regras de acesso (RLS) criadas pelo SQL. Nunca coloque a chave `service_role` no site.

Cada conta guarda na nuvem o progresso, os destaques, as configurações e a foto de perfil. O navegador mantém uma cópia local e sincroniza ao entrar, ao responder e ao sair.

## Armazenamento

As preferências, respostas e destaques são salvos no `localStorage` deste navegador/dispositivo. Eles não são sincronizados automaticamente entre dispositivos.
