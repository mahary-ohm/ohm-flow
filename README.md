# OhmFlow

Application interne de gestion des demandes pour Ohm Énergie. Monorepo pnpm avec frontend Next.js, API Fastify et schémas partagés.

Le schéma relationnel et les choix de modélisation sont présentés dans [docs/architecture.md](docs/architecture.md) avant toute migration. Consultez ce document pour installer l'environnement et démarrer les services.

OhmFlow inclut la connexion par session sécurisée, un tableau de bord selon le rôle, la création et la recherche de tickets, la prise en charge atomique, les transitions de statut contrôlées avec version optimiste, les commentaires internes, l'historique, l'administration des comptes et des cellules, ainsi que la documentation Swagger.

L'API nécessite PostgreSQL et un fichier `.env` local. Aucun compte de démonstration n'est codé en dur.
