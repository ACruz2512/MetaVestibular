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

## Armazenamento

As preferências, respostas e destaques são salvos no `localStorage` deste navegador/dispositivo. Eles não são sincronizados automaticamente entre dispositivos.
