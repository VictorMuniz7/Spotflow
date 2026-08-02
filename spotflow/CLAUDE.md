# CLAUDE.md

Este arquivo orienta o Claude Code ao trabalhar neste repositório.

## Stack
- Angular (latest) com Vite/esbuild como dev server
- Tailwind CSS para estilização
- TypeScript strict mode

## Convenções
- Prefira standalone components
- Use signals para estado reativo
- Separe lógica de negócio em services, não em components
- Nunca use `bypassSecurityTrustHtml` sem justificativa documentada
- Siga as boas práticas oficiais: https://angular.dev/ai/develop-with-ai