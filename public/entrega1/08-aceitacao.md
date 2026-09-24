# Termo de Aceitação

Declaramos para os devidos efeitos de avaliação que o sistema foi testado e cumpre todos os requisitos do laboratório de autenticação:
- O fluxo de login funciona corretamente com os provedores Google e GitHub.
- A base de dados D1 cria a transação OAuth (com PKCE e validação de State) e guarda a sessão de forma opaca.
- O endpoint `/api/me` valida rigorosamente a sessão local antes de expor os dados do perfil.
- O encerramento da sessão (Logout) destrói a sessão na base de dados por questões de segurança.
- As barreiras de segurança e os testes de falha foram executados e validados com sucesso.

Data: 24 de setembro de 2026
Assinaturas:
- Matheus de Araujo Pinho
