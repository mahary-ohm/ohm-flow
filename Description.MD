# Projet OhmFlow — Application interne de gestion de tickets pour Ohm Énergie

## 1. Ton rôle et ta mission

Agis comme un développeur full-stack senior spécialisé en TypeScript, Next.js, Fastify, PostgreSQL et conception d'applications métier.

Tu dois concevoir et développer **OhmFlow**, une application web interne de gestion des tickets pour Ohm Énergie.

L'application doit permettre aux utilisateurs de créer des tickets, de consulter les tickets de leur cellule et de suivre leur évolution. Des agents doivent pouvoir prendre en charge les tickets et les traiter. Les administrateurs doivent pouvoir gérer les utilisateurs, les cellules, les services et l'ensemble des tickets.

L'objectif est de produire une véritable application fonctionnelle, sécurisée, maintenable et évolutive, et non une simple maquette ou un prototype dont les boutons ne fonctionnent pas.

Tu dois commencer le travail immédiatement en examinant le projet, puis en proposant une architecture adaptée. Si le projet contient déjà du code, conserve ce qui est pertinent et évite d'écraser des fichiers sans les examiner.

Ne te limite pas à proposer des extraits de code : lorsque l'environnement te donne accès au système de fichiers et aux outils de développement, crée réellement les fichiers, implémente les fonctionnalités et vérifie leur fonctionnement.

## 2. Stack technique obligatoire

Utilise TypeScript pour l'ensemble de l'application.

### Frontend

- Next.js avec App Router.
- React.
- TypeScript en mode strict.
- Tailwind CSS.
- shadcn/ui pour les composants d'interface, si compatible avec le projet.
- React Hook Form pour la gestion des formulaires.
- Zod pour la validation des données.
- TanStack Query pour les requêtes serveur si cela apporte une réelle valeur.
- Une bibliothèque de tableaux et de composants adaptée aux besoins de l'application.

Le frontend doit être responsive, accessible et cohérent visuellement.

### Backend

- Fastify.
- TypeScript en mode strict.
- API REST versionnée sous `/api/v1`.
- Prisma comme ORM.
- Zod pour valider les entrées et les paramètres des routes.
- Une gestion centralisée des erreurs.
- Une documentation OpenAPI/Swagger de l'API.

Le backend Fastify doit contenir la logique métier et les règles d'autorisation.

Ne remplace pas Fastify par les API Routes ou les Server Actions de Next.js. Le frontend doit communiquer avec le backend par HTTP.

### Base de données

- PostgreSQL.
- Prisma pour l'accès aux données.
- Prisma Migrate pour les migrations.
- Clés étrangères, contraintes d'unicité et index pertinents.

### Organisation générale

Privilégie un monorepo TypeScript organisé de la manière suivante :

- `apps/web` : application Next.js.
- `apps/api` : serveur Fastify.
- `packages/shared` : schémas et types partagés lorsque cela est pertinent.
- `docs` : documentation technique.

Utilise un gestionnaire de paquets cohérent, de préférence pnpm, avec des scripts clairs pour lancer et tester les applications.

Ne crée pas une architecture inutilement complexe. Chaque module doit avoir une responsabilité claire.

## 3. Rôles et permissions

L'application doit gérer exactement trois rôles métier :

- `ADMIN` : administrateur.
- `USER` : utilisateur standard.
- `AGENT` : agent chargé du traitement des tickets.

Les permissions doivent être contrôlées côté backend pour chaque opération protégée.

### 3.1 Administrateur — `ADMIN`

L'administrateur possède les droits suivants :

- Consulter tous les tickets, quelle que soit leur cellule.
- Créer, consulter, modifier, désactiver et réactiver les comptes utilisateurs.
- Attribuer un rôle à un utilisateur.
- Associer un utilisateur à une cellule.
- Gérer les services et les cellules.
- Modifier le statut d'un ticket.
- Affecter un ticket à un agent.
- Réaffecter un ticket à un autre agent.
- Consulter l'historique des tickets.
- Consulter les indicateurs globaux du tableau de bord.

Un administrateur ne doit pas pouvoir supprimer ou désactiver accidentellement le dernier compte administrateur actif.

### 3.2 Utilisateur standard — `USER`

Un utilisateur standard peut :

- Se connecter et se déconnecter.
- Consulter son profil.
- Créer un ticket pour sa cellule.
- Consulter tous les tickets appartenant à sa cellule, y compris ceux créés par ses collègues.
- Consulter les détails, les statuts et les historiques accessibles des tickets de sa cellule.
- Rechercher et filtrer les tickets de sa cellule.
- Consulter ses propres tickets et leur évolution.

Un utilisateur standard ne peut pas :

- Consulter les tickets d'une autre cellule.
- Modifier le statut d'un ticket.
- S'attribuer un ticket en tant qu'agent.
- Affecter un ticket à un agent.
- Modifier les rôles des utilisateurs.
- Administrer les comptes utilisateurs.
- Modifier directement les informations de traitement d'un ticket.

Le créateur d'un ticket ne doit pas être le seul utilisateur autorisé à le consulter : tous les utilisateurs de sa cellule doivent pouvoir le voir.

### 3.3 Agent de traitement — `AGENT`

Un agent est un utilisateur chargé de traiter les tickets.

Il peut :

- Consulter les tickets relevant de son périmètre de traitement.
- Consulter les détails et l'historique des tickets autorisés.
- Prendre en charge un ticket qui n'est pas déjà attribué à un autre agent.
- Modifier le statut des tickets qu'il est autorisé à traiter.
- Ajouter des commentaires de traitement.
- Consulter ses tickets en cours et les tickets qui lui sont affectés.
- Marquer un ticket comme résolu lorsqu'il a terminé son traitement.

Il ne peut pas :

- Créer ou gérer des comptes administrateurs.
- Modifier les rôles des utilisateurs.
- Accéder aux tickets hors de son périmètre.
- Modifier arbitrairement le créateur ou la cellule d'un ticket.
- Modifier les données techniques du système sans autorisation.

Pour la première version, les agents sont autorisés à traiter les tickets des cellules auxquelles ils sont affectés. Un agent peut être associé à plusieurs cellules.

L'administrateur peut également affecter directement un ticket à un agent autorisé.

## 4. Authentification et gestion des comptes

Mettre en place une authentification complète comprenant :

- Une page de connexion.
- Une déconnexion effective.
- Une récupération de l'utilisateur connecté.
- Une protection des routes privées.
- Une gestion des rôles.
- Une gestion des comptes actifs et désactivés.

Les comptes sont créés par un administrateur. Il n'y a pas d'inscription publique.

Chaque utilisateur possède :

- Un identifiant unique.
- Un prénom.
- Un nom.
- Une adresse e-mail unique.
- Un mot de passe haché.
- Un rôle.
- Un statut actif ou inactif.
- Une date de création.
- Une date de dernière modification.

Les utilisateurs standards doivent obligatoirement être associés à une cellule.

Les agents peuvent être associés à plusieurs cellules de traitement. Les administrateurs peuvent avoir un accès transversal et ne sont pas obligés d'appartenir à une cellule.

Si un utilisateur est désactivé, il ne peut plus se connecter. Ses tickets et son historique restent conservés.

Utilise une authentification sécurisée adaptée à une application web interne. Privilégie une session serveur ou des cookies de session sécurisés avec les attributs appropriés, notamment `HttpOnly`, `Secure` en production et une politique `SameSite` adaptée.

Si des cookies sont utilisés, protège les opérations contre les attaques CSRF lorsque nécessaire.

Ne stocke pas les mots de passe en clair. Utilise Argon2id ou une solution de hachage reconnue correctement configurée.

Ne stocke jamais le token de session dans le localStorage. Ne retourne jamais les mots de passe hachés dans les réponses de l'API.

## 5. Gestion des utilisateurs

Créer une interface d'administration pour la gestion des utilisateurs.

Fonctionnalités :

- Afficher la liste des utilisateurs.
- Rechercher par nom, prénom ou adresse e-mail.
- Filtrer par rôle, cellule et statut du compte.
- Créer un utilisateur.
- Modifier ses informations.
- Modifier son rôle.
- Associer ou réaffecter un utilisateur à une cellule.
- Pour un agent, gérer les cellules qu'il est autorisé à traiter.
- Désactiver un compte.
- Réactiver un compte.
- Consulter les dates de création et de modification.

La suppression des utilisateurs est logique et non physique. Un compte désactivé doit rester référencé dans l'historique des tickets.

Utilise un champ tel que `isActive` ou `deletedAt` selon la stratégie retenue. Documente les conséquences de la désactivation.

Lors de la création d'un utilisateur, valide les données et vérifie l'unicité de l'adresse e-mail.

Les formulaires doivent afficher des messages d'erreur explicites et les listes doivent être paginées.

## 6. Gestion des services et des cellules

Un service représente une entité métier de l'entreprise. Une cellule représente une équipe ou une unité opérationnelle rattachée à un service.

### Service

Chaque service possède :

- Un identifiant unique.
- Un nom obligatoire.
- Une description facultative.
- Un statut actif ou inactif.
- Une date de création.
- Une date de modification.

### Cellule

Chaque cellule possède :

- Un identifiant unique.
- Un nom obligatoire.
- Une description facultative.
- Une référence vers le service auquel elle appartient.
- Un statut actif ou inactif.
- Une date de création.
- Une date de modification.

### Fonctionnalités

L'administrateur peut :

- Consulter la liste des services.
- Créer un service.
- Modifier un service.
- Activer ou désactiver un service.
- Consulter les cellules d'un service.
- Créer une cellule.
- Modifier une cellule.
- Activer ou désactiver une cellule.
- Consulter les utilisateurs associés à une cellule.
- Affecter des utilisateurs et des agents aux cellules.

Pour la première version, réserve les opérations de gestion des services et des cellules aux administrateurs.

Les services et les cellules ne doivent pas être physiquement supprimés lorsqu'ils sont utilisés par des tickets ou référencés dans un historique. Utilise la désactivation logique.

Un utilisateur standard ne peut créer un ticket que pour sa propre cellule. Le backend doit déterminer cette cellule à partir du compte authentifié, sans faire confiance à une valeur envoyée par le frontend.

## 7. Gestion des tickets

Un ticket représente une demande, un incident ou un problème nécessitant un suivi.

Chaque ticket possède au minimum :

- Un identifiant unique.
- Une référence lisible et unique, par exemple `TCK-2026-00001`.
- Un titre obligatoire.
- Une description obligatoire.
- Un statut.
- Une cellule associée.
- Un créateur.
- Un agent responsable, facultatif tant que le ticket n'est pas attribué.
- Une date de création.
- Une date de dernière modification.
- Une date de résolution facultative.

La référence du ticket doit être générée côté serveur, sans risque de doublon en cas de créations simultanées.

### 7.1 Création d'un ticket

Un utilisateur `USER` peut créer un ticket depuis un formulaire comprenant :

- Le titre.
- La description.
- Le service et la cellule concernés, affichés en lecture seule ou préremplis selon son rattachement.
- Un bouton de création.

Le ticket est automatiquement associé :

- À l'utilisateur connecté comme créateur.
- À la cellule d'appartenance de cet utilisateur.
- Au statut initial `OPEN`.

Ne fais jamais confiance au créateur, au rôle ou à la cellule envoyés par le frontend.

La création doit vérifier que l'utilisateur est actif et possède les permissions nécessaires.

### 7.2 Consultation des tickets

Les règles de visibilité sont les suivantes :

- `ADMIN` : tous les tickets.
- `USER` : tous les tickets de sa cellule.
- `AGENT` : les tickets des cellules qu'il est autorisé à traiter, ainsi que les tickets qui lui sont affectés, conformément aux règles de traitement.

Les règles doivent être appliquées dans les requêtes backend, y compris lors des recherches, des filtres, des exports éventuels et de la consultation d'un ticket individuel.

Un utilisateur ne doit pas pouvoir accéder à un ticket interdit en modifiant son identifiant dans une URL ou une requête HTTP.

### 7.3 Liste des tickets

Créer une interface de consultation avec :

- Référence du ticket.
- Titre.
- Cellule.
- Service.
- Créateur.
- Agent responsable.
- Statut.
- Date de création.
- Date de dernière modification.

Ajouter :

- Une recherche par référence et titre.
- Des filtres par statut, cellule et période.
- Des filtres adaptés au rôle connecté.
- Un tri.
- Une pagination côté serveur.
- Un accès à la fiche détaillée du ticket.

Les filtres ne doivent jamais élargir le périmètre de visibilité autorisé par le backend.

### 7.4 Détail d'un ticket

La fiche détaillée doit présenter :

- Toutes les informations du ticket.
- Le créateur.
- La cellule et le service concernés.
- Le statut actuel.
- L'agent responsable.
- L'historique des changements de statut.
- Les commentaires de traitement.
- Les dates importantes.

Les actions affichées dépendent du rôle et des permissions du compte connecté.

## 8. Cycle de vie des tickets

Définis les statuts suivants :

- `OPEN` : ticket créé, en attente de prise en charge.
- `IN_PROGRESS` : traitement en cours.
- `WAITING` : en attente d'informations ou d'une action externe.
- `RESOLVED` : résolution effectuée.
- `CLOSED` : ticket clôturé.

Le statut initial est `OPEN`.

Les transitions doivent être contrôlées côté backend.

Exemple de cycle :

1. Un utilisateur crée un ticket.
2. Le ticket devient visible aux utilisateurs de sa cellule et aux agents autorisés.
3. Un agent prend en charge le ticket, ou un administrateur l'affecte à un agent.
4. Le statut passe à `IN_PROGRESS`.
5. L'agent ajoute des commentaires et peut passer le ticket en `WAITING` si nécessaire.
6. L'agent marque le ticket comme `RESOLVED` lorsqu'il a terminé.
7. Un agent autorisé ou un administrateur peut clôturer le ticket selon les règles définies.

Un ticket déjà attribué à un agent ne peut pas être pris en charge par un autre agent sans réaffectation autorisée.

Empêche les changements de statut incohérents. Vérifie les permissions et le statut courant avant chaque transition.

En cas de modification simultanée d'un ticket par plusieurs agents, évite les écrasements silencieux. Utilise une stratégie de contrôle de concurrence adaptée.

## 9. Prise en charge et attribution des tickets

L'application doit distinguer la cellule concernée par un ticket de l'agent chargé de le traiter.

Un ticket appartient à une cellule métier. Un agent est autorisé à traiter les tickets d'une ou plusieurs cellules.

Prévoir les fonctionnalités suivantes :

- Voir les tickets disponibles à prendre en charge.
- Prendre en charge un ticket non attribué.
- Voir les tickets attribués à l'agent connecté.
- Libérer ou réaffecter un ticket selon les permissions.
- Permettre à un administrateur d'affecter un ticket à un agent autorisé.
- Afficher clairement l'agent responsable sur la fiche du ticket.

La prise en charge doit être atomique : deux agents ne doivent pas pouvoir s'attribuer simultanément le même ticket.

Toute affectation ou réaffectation doit être historisée avec l'identité de l'auteur et la date.

## 10. Historique et commentaires

Créer un historique des changements de statut.

Chaque entrée d'historique contient :

- Le ticket concerné.
- L'ancien statut.
- Le nouveau statut.
- L'utilisateur ayant effectué l'action.
- La date et l'heure.
- Un commentaire facultatif.

Créer également un système de commentaires de traitement, si nécessaire, pour permettre aux agents d'expliquer les actions effectuées et les informations en attente.

Chaque commentaire contient :

- Le ticket concerné.
- L'auteur.
- Le contenu.
- La date de création.

Les commentaires et l'historique ne doivent pas être modifiables ou supprimés arbitrairement. Toute modification exceptionnelle doit respecter une règle métier explicite et conserver une traçabilité suffisante.

Pour la première version, les commentaires sont internes à l'application. Il n'est pas nécessaire d'envoyer des notifications par e-mail.

## 11. Tableau de bord

Créer un tableau de bord adapté au rôle de l'utilisateur.

### Tableau de bord `USER`

Afficher :

- Le nombre de tickets de sa cellule.
- Le nombre de tickets ouverts.
- Le nombre de tickets en cours.
- Le nombre de tickets résolus.
- Les derniers tickets de sa cellule.

### Tableau de bord `AGENT`

Afficher :

- Les tickets qui lui sont attribués.
- Les tickets disponibles à prendre en charge dans son périmètre.
- Le nombre de tickets en cours.
- Les tickets en attente.
- Les tickets récemment résolus.

### Tableau de bord `ADMIN`

Afficher :

- Le nombre total de tickets.
- La répartition des tickets par statut.
- La répartition par service et cellule.
- Les tickets récemment créés.
- Les tickets non attribués.
- Le nombre d'utilisateurs actifs.
- Des filtres par période, service et cellule.

Les indicateurs doivent provenir de données réelles de la base de données. Ne pas utiliser de valeurs fictives dans le tableau de bord final.

## 12. Modèle de données Prisma

Conçois au minimum les modèles suivants :

- `User`
- `Service`
- `Cell`
- `AgentCell` ou une relation plusieurs-à-plusieurs équivalente si nécessaire.
- `Ticket`
- `TicketStatusHistory`
- `TicketAssignmentHistory`
- `TicketComment`
- `Session` si l'authentification repose sur des sessions persistées.

### Relations attendues

- Un service possède plusieurs cellules.
- Une cellule appartient à un service.
- Une cellule peut être associée à plusieurs utilisateurs.
- Un utilisateur standard appartient à une seule cellule.
- Un agent peut être autorisé à traiter plusieurs cellules.
- Un utilisateur peut créer plusieurs tickets.
- Un ticket appartient à une cellule.
- Un ticket possède un créateur.
- Un ticket peut être attribué à un agent.
- Un ticket possède un historique de statut.
- Un ticket peut avoir plusieurs commentaires.
- Les changements d'affectation sont historisés.

Un administrateur peut être indépendant d'une cellule.

Le modèle doit distinguer explicitement :
- La cellule d'appartenance d'un utilisateur.
- Les cellules de traitement autorisées pour un agent.
- La cellule métier d'un ticket.
- L'agent responsable du ticket.

Utilise des clés étrangères, des contraintes d'intégrité, des index et des dates cohérentes.

Privilégie les suppressions logiques pour les entités métier référencées par des tickets.

Prévois un champ `version` ou une stratégie équivalente si cela facilite le contrôle de concurrence des mises à jour de tickets.

Présente le schéma Prisma proposé avant de figer la structure de la base de données.

## 13. API REST

Organise l'API sous `/api/v1`.

Prévois des routes cohérentes pour :

### Authentification
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Utilisateurs
- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id`
- `DELETE /api/v1/users/:id` pour une désactivation logique
- Une route explicite pour réactiver un compte si nécessaire.

### Services et cellules
- `GET /api/v1/services`
- `POST /api/v1/services`
- `PATCH /api/v1/services/:id`
- `GET /api/v1/cells`
- `POST /api/v1/cells`
- `PATCH /api/v1/cells/:id`
- Des routes d'affectation des utilisateurs et des agents aux cellules.

### Tickets
- `GET /api/v1/tickets`
- `POST /api/v1/tickets`
- `GET /api/v1/tickets/:id`
- `POST /api/v1/tickets/:id/claim`
- `PATCH /api/v1/tickets/:id/assignment`
- `PATCH /api/v1/tickets/:id/status`
- `GET /api/v1/tickets/:id/history`
- `GET /api/v1/tickets/:id/comments`
- `POST /api/v1/tickets/:id/comments`

Adapte ces routes si une convention plus cohérente est justifiée.

Pour chaque route, définis :
- Les rôles autorisés.
- Les paramètres.
- Le schéma de validation.
- Le format de réponse.
- Les erreurs possibles.
- Les contrôles d'accès aux données.

Génère une documentation OpenAPI/Swagger exploitable, idéalement accessible dans l'environnement de développement.

## 14. Architecture du backend

Organise le backend par domaines fonctionnels.

Exemple indicatif :

- `modules/auth`
- `modules/users`
- `modules/services`
- `modules/cells`
- `modules/tickets`
- `modules/ticket-history`
- `plugins`
- `common`
- `config`

Dans chaque module, sépare les responsabilités nécessaires :

- Routes HTTP.
- Schémas de validation.
- Services métier.
- Accès à la base de données.
- Contrôles d'autorisation.

Évite de mettre toute la logique métier dans les routes Fastify.

Centralise les vérifications d'identité, de rôle et de périmètre de cellule.

Ne considère jamais un identifiant envoyé par le frontend comme une preuve d'autorisation.

Utilise des transactions de base de données lorsque plusieurs opérations doivent être exécutées ensemble, notamment lors d'un changement de statut avec création de l'historique.

## 15. Architecture du frontend

Utilise Next.js App Router.

Organise l'interface par fonctionnalités et sépare :

- Les pages.
- Les composants UI.
- Les formulaires.
- Les appels à l'API.
- Les schémas de validation.
- Les hooks métier.
- La gestion de la session.
- Les types partagés.

Crée des composants réutilisables pour :

- Les tableaux.
- Les filtres.
- Les formulaires.
- Les badges de statut.
- Les confirmations d'actions sensibles.
- Les messages de succès et d'erreur.
- Les états de chargement.
- Les états vides.

Prévois les pages suivantes :

1. Connexion.
2. Tableau de bord.
3. Liste des tickets.
4. Création d'un ticket.
5. Détail d'un ticket.
6. Espace de traitement des agents.
7. Liste des utilisateurs.
8. Création et modification d'un utilisateur.
9. Liste des services.
10. Gestion des cellules.
11. Profil de l'utilisateur.

Adapte les menus et les actions au rôle connecté.

L'interface doit être professionnelle, sobre et moderne, adaptée à un outil interne d'entreprise. Utilise une navigation claire, une hiérarchie visuelle cohérente, des formulaires accessibles et des tableaux lisibles.

Prévois les états de chargement, les erreurs API, les formulaires invalides et les listes vides.

Aucun bouton ne doit être purement décoratif : chaque action affichée doit être implémentée ou explicitement indiquée comme non disponible.

## 16. Sécurité

Applique les bonnes pratiques suivantes :

- Hashage sécurisé des mots de passe.
- Sessions sécurisées et expiration appropriée.
- Validation systématique des données côté backend.
- Contrôle des permissions sur toutes les routes protégées.
- Protection contre les accès directs non autorisés aux tickets.
- CORS restrictif.
- Protection CSRF lorsque nécessaire.
- Limitation du débit des tentatives de connexion.
- Gestion des erreurs sans fuite de données sensibles.
- Secrets dans les variables d'environnement.
- Aucun secret dans le dépôt Git.
- Aucun mot de passe ou token dans les logs.
- Contrôles de concurrence pour les affectations de tickets.
- Journalisation des opérations administratives et métier sensibles.

Fournis un fichier `.env.example` sans aucune vraie valeur secrète.

Ne crée pas de compte administrateur avec un mot de passe fixe codé en dur.

Prévois un mécanisme sûr pour initialiser le premier administrateur.

## 17. Tests

Mets en place des tests unitaires, des tests d'intégration et, pour les parcours essentiels, des tests end-to-end.

Les tests doivent notamment vérifier :

### Authentification
- Connexion valide.
- Mot de passe invalide.
- Compte désactivé.
- Accès sans session.
- Déconnexion.

### Autorisations
- Un utilisateur standard ne peut pas accéder aux tickets d'une autre cellule.
- Un utilisateur standard peut voir les tickets de sa cellule, même s'ils ont été créés par ses collègues.
- Un agent ne peut consulter ou traiter que les tickets de son périmètre.
- Un administrateur peut consulter tous les tickets.
- Un utilisateur ne peut pas modifier son propre rôle par une requête non autorisée.

### Tickets
- Création d'un ticket.
- Attribution automatique de la cellule du créateur.
- Statut initial `OPEN`.
- Prise en charge par un agent autorisé.
- Impossibilité pour deux agents de prendre simultanément le même ticket.
- Transitions de statut autorisées et refusées.
- Historisation des changements de statut.
- Conservation de l'historique après désactivation d'un utilisateur.

### Administration
- Création et modification d'un utilisateur.
- Désactivation et réactivation d'un compte.
- Gestion des cellules de traitement des agents.
- Préservation du dernier administrateur actif.

Les tests doivent utiliser une base de test isolée et ne jamais toucher aux données de production.

## 18. Configuration et démarrage

Fournis :

- Un `README.md` complet.
- Les instructions d'installation.
- Les commandes de développement.
- Les commandes de build.
- Les commandes de test.
- Les instructions de migration de la base de données.
- Un fichier `.env.example`.
- Un `docker-compose.yml` pour PostgreSQL et les services utiles au développement, si adapté.
- Un script sécurisé d'initialisation du premier administrateur.
- La documentation OpenAPI.

Prévois des scripts clairs, par exemple :

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm db:migrate`

Les scripts doivent réellement fonctionner. Adapte-les au gestionnaire de paquets et à l'organisation retenus.

## 19. Méthode de travail obligatoire

Travaille progressivement, en vérifiant le résultat de chaque étape.

### Étape 1 — Inspection
- Examine le dépôt et son état Git.
- Identifie les fichiers existants.
- Vérifie l'environnement technique et les dépendances.
- N'écrase pas les fichiers existants sans les avoir examinés.
- Présente brièvement les constats.

### Étape 2 — Conception
- Définis l'architecture.
- Propose le modèle de données Prisma.
- Décris les rôles et permissions.
- Décris le cycle de vie des tickets.
- Identifie les ambiguïtés métier réellement bloquantes.
- Propose les conventions de nommage et les scripts.

Ne pose pas de questions sur des détails déjà décidés dans ce prompt. Pour les choix non bloquants, adopte des valeurs par défaut raisonnables et documente-les.

### Étape 3 — Initialisation
- Crée la structure du projet.
- Configure TypeScript.
- Configure Next.js et Fastify.
- Configure Prisma et PostgreSQL.
- Prépare les variables d'environnement.
- Vérifie que le projet démarre.

### Étape 4 — Backend
- Implémente le schéma de données et les migrations.
- Implémente l'authentification.
- Implémente les autorisations.
- Implémente les utilisateurs, services et cellules.
- Implémente les tickets, les affectations, les commentaires et l'historique.
- Documente l'API.
- Ajoute les tests du backend.

### Étape 5 — Frontend
- Implémente les pages.
- Implémente les formulaires et tableaux.
- Connecte les pages au backend.
- Implémente la gestion de session et les menus par rôle.
- Gère les erreurs et les états de chargement.

### Étape 6 — Vérification
- Exécute les migrations sur la base de développement.
- Exécute les tests.
- Lance le contrôle TypeScript.
- Lance le lint et le build.
- Corrige les erreurs rencontrées.
- Vérifie les parcours principaux.

### Étape 7 — Livraison
- Mets à jour le README.
- Documente les choix techniques.
- Fournis les commandes pour démarrer l'application.
- Signale les fonctionnalités terminées et celles qui restent à faire.
- Ne prétends jamais qu'un test ou une fonctionnalité a été vérifié si cela n'a pas réellement été fait.

## 20. Critères d'acceptation

La première version est considérée comme fonctionnelle lorsque :

1. Un administrateur peut créer un utilisateur et l'associer à une cellule.
2. Un administrateur peut créer un agent et lui attribuer une ou plusieurs cellules de traitement.
3. Un utilisateur standard peut se connecter et créer un ticket pour sa cellule.
4. Tous les utilisateurs standards d'une même cellule peuvent consulter les tickets de cette cellule.
5. Un utilisateur ne peut pas accéder aux tickets d'une autre cellule.
6. Un agent peut consulter les tickets de son périmètre et en prendre un en charge.
7. Un agent ne peut pas prendre un ticket déjà attribué à un autre agent sans autorisation.
8. Un agent autorisé peut mettre à jour le statut d'un ticket.
9. L'administrateur peut consulter tous les tickets et les affecter aux agents.
10. Les changements de statut et les affectations sont historisés.
11. Les utilisateurs désactivés ne peuvent plus se connecter.
12. Les contrôles d'autorisation sont testés côté backend.
13. Le projet peut être installé, lancé et testé en suivant le README.
14. La documentation OpenAPI reflète les endpoints réellement implémentés.

## Consigne finale

Commence maintenant par examiner le projet existant et son environnement.

Présente ensuite brièvement l'architecture proposée, le modèle de données Prisma et les règles d'autorisation.

Si tu disposes d'un environnement de développement permettant de modifier les fichiers, poursuis ensuite l'implémentation de manière autonome, étape par étape, sans attendre une validation après chaque fichier. Ne t'arrête pour poser une question que si une décision métier indispensable empêche réellement de continuer.

Ne génère pas tout le code dans une seule réponse textuelle : crée les fichiers dans le projet, exécute les vérifications disponibles et livre une application réellement exploitable.