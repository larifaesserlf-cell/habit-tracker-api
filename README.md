



# Habit Tracker API

API REST para gerenciamento de hábitos diários, com autenticação de usuários e acompanhamento de sequências (streaks).

## Objetivo

Projeto de estudo com escopo fechado, construído para consolidar fundamentos de back-end: autenticação, modelagem relacional, testes automatizados e deploy. Prioridade é terminar com qualidade, não acumular features.

## Stack

- **Framework:** Next.js (API Routes)
- **Linguagem:** TypeScript
- **Banco de dados:** Supabase (PostgreSQL gerenciado)
- **Autenticação:** Tabela própria de usuários + hash de senha (bcrypt)
- **Testes:** Jest + Supertest
- **Deploy:** Vercel

## Escopo

### Incluído
- [ ] Cadastro e login de usuário
- [ ] CRUD de hábitos (criar, listar, editar, remover)
- [ ] Marcar hábito como concluído no dia
- [ ] Cálculo de streak (sequência de dias consecutivos)
- [ ] Testes básicos das rotas principais
- [ ] Deploy funcional em produção

### Fora do escopo (por enquanto)
- Frontend com telas completas (só o necessário pra testar as rotas)
- Recuperação de senha / OAuth social
- Notificações
- Paginação e filtros avançados

## Status

🚧 Em construção — projeto de aprendizado, Semana 1 (setup).

## Como rodar localmente

_(a preencher conforme o setup avança)_