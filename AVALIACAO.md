## Crítica à IA (Tarefa 3, item 4)
Na revisão do migrar.yml, a IA apontou NOME_DO_BANCO como "erro de lógica na linha 14", mas na tabela da mesma resposta ela citou a linha 12. As duas localizações não podem estar certas, então ela foi imprecisa. Além disso, era só o placeholder do esqueleto do enunciado, e não um erro de lógica real. A IA acertou o problema, mas errou a localização e a classificação, por isso o revisor humano precisa conferir o que ela diz.

## Perguntas

**1. Por que o ci.yml roda duas vezes e qual o status check da main considera?**
O workflow tem os gatilhos `push` (sem filtro) e `pull_request`. Um push numa ramificação com PR aberto dispara os dois eventos. A main considera a execução do evento `pull_request` (ci / verificar (pull_request)), que é a marcada como Required no PR.

**2. Por que um PR de fork não consegue usar secrets.COPILOT_PAT? Qual ataque isso impede?**
O GitHub não passa os segredos do repositório de destino para workflows disparados por pull_request vindos de forks. Isso impede que alguém abra um PR de fork alterando o workflow para imprimir ou enviar o segredo para fora (exfiltração), já que o código do PR roda no workflow.

**3. Por que declarar permissions em vez de usar as padrão do GITHUB_TOKEN?**
Pelo princípio do menor privilégio. O token padrão pode ter mais permissões do que o necessário. Declarando só `contents: read` e `pull-requests: write`, o workflow tem apenas o que precisa, e se ele for abusado o estrago é menor.

**4. A revisão da IA pode substituir o status check da Tarefa 2?**
Não. Na crítica do item 4, a IA foi inconsistente (linha 14 contra linha 12) e classificou errado um placeholder. Ela é não determinística, pode errar ou falhar, e o comentário dela não bloqueia o merge. O status check é determinístico e impede o merge quando falha.


Tarefa 1
error:
https://github.com/MatheusPinho-Dev-BR/Login-git-gogle/actions/runs/38329425141/job/115075521889
Parse error near line 1: near "CRIAR": syntax error
certo:
https://github.com/MatheusPinho-Dev-BR/Login-git-gogle/actions/runs/38331181142

Tarefa 2
error
https://github.com/MatheusPinho-Dev-BR/Login-git-gogle/pull/2

Tarefa 3
https://github.com/MatheusPinho-Dev-BR/Login-git-gogle/pull/7
Run gh pr comment 8 --body-file resposta.md
GraphQL: Resource not accessible by integration (addComment)
Error: Process completed with exit code 1.

Tarefa 4
https://github.com/MatheusPinho-Dev-BR/Login-git-gogle/actions/runs/38819697885/job/116712983055
<img width="560" height="222" alt="image" src="https://github.com/user-attachments/assets/3ac4a60f-718c-43d0-bcfe-624fe0729f3d" />
