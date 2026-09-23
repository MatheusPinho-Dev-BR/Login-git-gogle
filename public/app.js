document.addEventListener('DOMContentLoaded', async () => {
    const statusMensagem = document.getElementById('status-mensagem');
    const areaLogin = document.getElementById('area-login');
    const areaLogado = document.getElementById('area-logado');

    try {
        statusMensagem.innerText = "Consultando sessão...";

        // Faz uma requisição GET para a nossa rota autenticada
        const response = await fetch('/api/me');

        if (response.ok) {
            // Se retornar 200 OK, o usuário está logado
            const userData = await response.json();
            
            document.getElementById('user-nome').innerText = userData.displayName || 'Não informado';
            document.getElementById('user-email').innerText = userData.email || 'Não informado';
            document.getElementById('user-provedor').innerText = userData.issuer;
            
            statusMensagem.style.display = 'none'; // Esconde a mensagem inicial
            areaLogado.style.display = 'block'; // Mostra o perfil do usuário
        } else {
            // Se retornar erro (ex: 401 Unauthorized), o usuário não está logado
            statusMensagem.innerText = "Você não está autenticado.";
            areaLogin.style.display = 'block'; // Mostra os botões de login
        }
    } catch (error) {
        statusMensagem.innerText = "Erro ao consultar a sessão.";
        console.error("Erro no fetch:", error);
    }

    // Configurando o botão de Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                // O logout exige um POST para a mesma origem, conforme o requisito do laboratório
                const response = await fetch('/oauth/logout', { 
                    method: 'POST' 
                });
                
                if (response.ok || response.redirected) {
                    // Recarrega a página para voltar à tela inicial de login
                    window.location.reload();
                } else {
                    alert("Falha ao encerrar a sessão.");
                }
            } catch (error) {
                console.error("Erro ao fazer logout:", error);
            }
        });
    }
});
