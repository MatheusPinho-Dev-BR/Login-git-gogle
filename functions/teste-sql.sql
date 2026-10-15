   env.DB.prepare("SELECT * FROM notas WHERE aluno = ?").bind(nome)
