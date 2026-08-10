# My Academic Hub

Vamos criar o esqueleto inicial de um app de biblioteca pessoal de referências acadêmicas (estilo Mendeley, uso pessoal).

Por enquanto, faça APENAS o escopo mínimo abaixo — o restante das funcionalidades será construído depois via Claude Code, então não gere features além destas:

1. App base em React + Tailwind + shadcn/ui (stack padrão), nome do projeto: "Biblioteca de Referências"
2. Uma tela de login simples (email + senha via Supabase Auth) — SEM tela de cadastro/criação de conta pública. O único usuário será criado manualmente no painel do Supabase depois.
3. Uma tela principal vazia, protegida por login, com um cabeçalho simples e um placeholder "Suas referências aparecerão aqui"
4. NÃO crie tabelas no banco ainda e NÃO conecte ao Lovable Cloud — vamos conectar um projeto Supabase próprio (externo) manualmente em seguida, com um schema que já foi projetado.

Pode parar por aqui após esse esqueleto inicial.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2b4a7b20-5f5e-4f87-a41c-83efd1e19e84).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
