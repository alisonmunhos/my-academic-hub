# Ícone do app e da aba do navegador

Usar a mesma marca do cabeçalho (o livro com marcador em fundo escuro/primário) como ícone oficial: aparece na aba do navegador e como ícone do app quando instalado no celular ("Adicionar à tela de início").

## O que será feito

1. Gerar o ícone quadrado da marca (livro com marcador, fundo primário arredondado) em alta resolução, a partir da referência enviada.
2. Criar os arquivos de ícone em `public/`:
   - `favicon.png` (ícone da aba)
   - `icon-192.png` e `icon-512.png` (ícone do app instalado)
   - `apple-touch-icon.png` (iPhone/iPad)
3. Criar `public/manifest.webmanifest` com nome "Biblioteca de Referências", nome curto "Referências", `display: standalone`, cor de tema e de fundo alinhadas ao tema do app, e os ícones acima.
4. Referenciar no `head()` da rota raiz (`src/routes/__root.tsx`): `manifest`, `icon`, `apple-touch-icon` e `theme-color`, substituindo o `favicon.ico` padrão do Lovable.
5. Remover `public/favicon.ico` antigo para não servir o ícone genérico.

## Observações técnicas

- Apenas ícone + manifest (sem service worker e sem modo offline), então nada muda no funcionamento atual do app.
- O ícone só aparece no domínio publicado depois de um novo **Publish**.
- Se o app já estiver instalado no celular, pode ser necessário remover e adicionar de novo à tela de início para o ícone atualizar.
