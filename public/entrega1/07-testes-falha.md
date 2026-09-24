# Testes de Falha - Segurança OAuth

## 1. Falha de Provedor Inexistente
- **Ação:** Acesso direto à rota `/oauth/login/microsoft`.
- **Resultado Obtido:** O servidor rejeitou o pedido e devolveu o erro 404 (Not Found), comprovando que apenas provedores autorizados (Google e GitHub) são aceites.

## 2. Acesso Direto ao Callback (Sem Estado)
- **Ação:** Acesso direto à rota `/oauth/callback/google` em janela anónima.
- **Resultado Obtido:** O sistema bloqueou o acesso com a mensagem "Parâmetros inválidos ou erro no provedor" (Erro 400). A transação foi abortada por falta dos parâmetros `code`, `state` e do cookie de transação original.

## 3. Consulta de Perfil sem Autenticação
- **Ação:** Acesso direto à rota `/api/me` em janela anónima.
- **Resultado Obtido:** O servidor devolveu o estado `401 Unauthorized`. O perfil não é exposto pois o cookie opaco `Host-session` está ausente.

## 4. Proteção CSRF no Logout
- **Ação:** Acesso à rota `/oauth/logout` através de um pedido GET (digitando diretamente na barra de endereço).
- **Resultado Obtido:** O sistema ignorou a rota de destruição de sessão (que exige o método POST) e carregou a interface padrão de fallback, protegendo o sistema contra falsificação de pedidos.
