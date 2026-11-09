# OhmFlow - architecture et démarrage

## Décision de modèle avant migration

Le schéma Prisma initial est défini dans `apps/api/prisma/schema.prisma`. Il sépare le rattachement métier (`User.cellId`) du périmètre de traitement (`AgentCell`) et de la cellule du ticket (`Ticket.cellId`). Les relations qui portent de l'historique utilisent `Restrict`; les utilisateurs, services et cellules sont désactivés logiquement. `Ticket.version` sert au contrôle optimiste de concurrence. Une session persiste côté base, tandis que son identifiant est transporté dans un cookie HttpOnly.

La référence lisible est unique en base. Un compteur annuel verrouillé par upsert transactionnel fournit un numéro distinct sous créations concurrentes. Le schéma est validé mais aucune migration de production n'est créée dans ce workspace.

## Modules

- `apps/web`: Next.js App Router, expérience OhmFlow en français, responsive et appels HTTP avec cookies de session.
- `apps/api`: Fastify, endpoints `/api/v1`, validation Zod, autorisation métier, Swagger sur `/docs`.
- `packages/shared`: contrats Zod et types partagés.
- PostgreSQL + Prisma: données et migrations.

## Mise en route

1. Installer Node.js 20+ et pnpm 10+; disposer de PostgreSQL 15+.
2. Copier `.env.example` vers `apps/api/.env`, renseigner `DATABASE_URL`, puis générer un secret de session aléatoire d'au moins 32 caractères.
3. `pnpm install`
4. `pnpm db:generate`
5. `pnpm db:migrate`
6. Initialiser le premier administrateur par variables d'environnement à usage unique `ADMIN_EMAIL`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_PASSWORD` (au moins 16 caractères), puis `pnpm db:seed-admin`.
7. `pnpm dev` lance OhmFlow sur `http://localhost:3000` et l'API sur `http://localhost:4000`.

Le frontend utilise `NEXT_PUBLIC_API_URL` (par défaut `http://localhost:4000`). La session de développement utilise le stockage mémoire Fastify; configurez un store PostgreSQL/Redis avant toute mise en production, car les sessions mémoire ne survivent pas aux redémarrages et ne conviennent pas au multi-instance.

## Routes principales

- Authentification: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`.
- Tickets: `GET/POST /api/v1/tickets`, `GET /api/v1/tickets/:id`, `POST /api/v1/tickets/:id/claim`, `PATCH /api/v1/tickets/:id/assignment`, `PATCH /api/v1/tickets/:id/status`, `GET/POST /api/v1/tickets/:id/comments`.
- Administration: `GET/POST/PATCH/DELETE /api/v1/users`, `GET/POST/PATCH /api/v1/services`, `GET/POST/PATCH /api/v1/cells`, `GET/POST/PATCH /api/v1/ticket-categories`.

Les catégories de ticket sont gérées par un administrateur et désactivées logiquement. La création d’un nouveau ticket exige une catégorie active; les tickets existants peuvent rester sans catégorie.
- Indicateurs: `GET /api/v1/dashboard`.

## Limites fonctionnelles à traiter avant production

L'affectation admin atomique et historisée est disponible. La désactivation du dernier administrateur est protégée dans l'API. Les listes utilisateurs et tickets ont des bases paginées, mais les filtres cellule/date et les écrans d'édition complète des utilisateurs restent à compléter. Le store de session mémoire doit être remplacé par un store partagé persistant. Le contrôle CSRF dépend du couple origine SameSite; déployer web et API sous une origine maîtrisée, restreindre CORS, et ajouter un jeton CSRF si le contexte d'hébergement le demande. Ces points sont visibles et ne sont pas présentés comme achevés.

## Tests

`pnpm test` exécute les tests de contrats Zod. Ajouter une base PostgreSQL isolée et des tests d'intégration HTTP avant de valider les parcours d'autorisation en environnement de production.
