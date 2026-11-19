# OhmFlow : référence de l'API

Ce document décrit tous les endpoints exposés par `apps/api` (Fastify). Il est tiré du code source : [apps/api/src/server.ts](../apps/api/src/server.ts) pour les routes et [packages/shared/src/index.ts](../packages/shared/src/index.ts) pour les schémas de validation. Swagger (`/docs`) liste les mêmes routes, mais sans les corps de requête ni les règles d'accès.

## Sommaire

- [Généralités](#généralités)
- [Santé](#santé)
- [Authentification](#authentification)
- [Tableau de bord](#tableau-de-bord)
- [Tickets](#tickets)
- [Commentaires](#commentaires)
- [Référentiels : services, cellules, GRD, catégories](#référentiels)
- [Utilisateurs](#utilisateurs)
- [Annexe : objets renvoyés](#annexe--objets-renvoyés)

---

## Généralités

### URL de base

| Environnement | URL |
|---|---|
| Développement | `http://localhost:4000` |
| Préfixe métier | `/api/v1` (sauf `/health` et `/docs`) |

### Authentification par session

- `POST /api/v1/auth/login` crée une session et pose le cookie `ohmflow.sid` (`HttpOnly`, `SameSite=Lax`, `Secure` en production, durée de 30 jours, renouvelée à chaque requête).
- Toutes les autres requêtes doivent envoyer ce cookie. Depuis un navigateur, utiliser `fetch(..., { credentials: "include" })`.
- La session est invalidée si le compte est désactivé ou si son mot de passe est changé par un administrateur (`sessionVersion` incrémentée).

### Rôles

| Rôle | Description |
|---|---|
| `ADMIN` | Accès complet : administration, affectation, tous les tickets. |
| `AGENT` | Traite les tickets des cellules qui lui sont autorisées (`AgentCell`). |
| `USER` | Rattaché à une cellule (`cellId`). Crée et suit des tickets. |

Dans les tableaux ci-dessous, la colonne **Accès** indique :
- **Public** : aucune session requise.
- **Connecté** : n'importe quel rôle authentifié.
- **ADMIN**, **AGENT**… : rôles autorisés uniquement.

### Visibilité des tickets

Un ticket est visible :

| Rôle | Tickets visibles |
|---|---|
| `ADMIN` | Tous |
| `USER` | Ceux de sa cellule **ou** ceux qu'il a créés |
| `AGENT` | Ceux de ses cellules autorisées **ou** ceux qui lui sont affectés **ou** ceux qu'il a créés |

Un ticket hors du périmètre répond **404** (et non 403) pour ne pas révéler son existence.

### Format des erreurs

Toutes les erreurs ont la forme :

```json
{ "error": "Message lisible en français" }
```

| Code | Cas |
|---|---|
| `400` | Validation Zod échouée (`{ "error": "Validation invalide", "details": { "formErrors": [], "fieldErrors": { ... } } }`), référence invalide (Prisma P2003) ou règle métier. |
| `401` | `Authentification requise` (pas de session ou session expirée). |
| `403` | `Permission insuffisante` (rôle non autorisé) ou règle métier. |
| `404` | Ressource introuvable ou hors périmètre (y compris Prisma P2025). |
| `409` | Conflit : valeur unique déjà prise (P2002), version obsolète, transition de statut interdite. |
| `429` | Limitation de débit dépassée. |
| `500` | `Erreur interne du serveur`. |

### Concurrence optimiste (`version`)

Les tickets portent un champ `version`. Les endpoints qui modifient un ticket (`PATCH /tickets/:id`, `/status`, `/assignment`) exigent la `version` lue par le client. Si elle ne correspond plus, l'API répond **409** : il faut recharger le ticket puis réessayer. Chaque modification incrémente `version`.

### Limitation de débit

- Globale : 100 requêtes par minute et par IP.
- `POST /api/v1/auth/login` : 8 tentatives par 15 minutes et par IP.

### Pagination

Les listes paginées renvoient :

```json
{ "items": [ ... ], "total": 42, "page": 1, "pageSize": 20 }
```

---

## Récapitulatif des endpoints

| Méthode | Chemin | Accès | Rôle |
|---|---|---|---|
| GET | `/health` | Public | Santé du service |
| GET | `/docs` | Public (hors production) | Interface Swagger |
| POST | `/api/v1/auth/login` | Public | Connexion |
| POST | `/api/v1/auth/logout` | Connecté | Déconnexion |
| GET | `/api/v1/auth/me` | Connecté | Utilisateur courant |
| GET | `/api/v1/dashboard` | Connecté | Indicateurs |
| GET | `/api/v1/tickets` | Connecté | Lister et rechercher des tickets |
| POST | `/api/v1/tickets` | Connecté | Créer un ticket |
| GET | `/api/v1/tickets/:id` | Connecté (périmètre) | Détail d'un ticket |
| PATCH | `/api/v1/tickets/:id` | Créateur du ticket | Modifier un ticket |
| POST | `/api/v1/tickets/:id/claim` | AGENT | Prendre en charge |
| PATCH | `/api/v1/tickets/:id/assignment` | ADMIN | Affecter ou désaffecter |
| PATCH | `/api/v1/tickets/:id/status` | ADMIN, AGENT | Changer le statut |
| GET | `/api/v1/tickets/:id/comments` | Connecté (périmètre) | Lister les commentaires |
| POST | `/api/v1/tickets/:id/comments` | Connecté (périmètre) | Commenter |
| GET | `/api/v1/services` | Connecté | Lister les services et leurs cellules |
| POST | `/api/v1/services` | ADMIN | Créer un service |
| PATCH | `/api/v1/services/:id` | ADMIN | Modifier un service |
| GET | `/api/v1/cells` | Connecté | Lister les cellules actives |
| POST | `/api/v1/cells` | ADMIN | Créer une cellule |
| PATCH | `/api/v1/cells/:id` | ADMIN | Modifier une cellule |
| GET | `/api/v1/grds` | Connecté | Lister les GRD |
| POST | `/api/v1/grds` | ADMIN | Créer un GRD |
| PATCH | `/api/v1/grds/:id` | ADMIN | Modifier un GRD |
| GET | `/api/v1/ticket-categories` | Connecté | Lister les catégories |
| POST | `/api/v1/ticket-categories` | ADMIN | Créer une catégorie |
| PATCH | `/api/v1/ticket-categories/:id` | ADMIN | Modifier une catégorie |
| GET | `/api/v1/users` | ADMIN | Lister les utilisateurs |
| POST | `/api/v1/users` | ADMIN | Créer un utilisateur |
| PATCH | `/api/v1/users/:id` | ADMIN | Modifier un utilisateur |
| DELETE | `/api/v1/users/:id` | ADMIN | Désactiver un utilisateur |

---

## Santé

### `GET /health`

**Accès** : Public

**Réponse 200**

```json
{ "status": "ok" }
```

### `GET /docs`

Interface Swagger UI. Disponible si `NODE_ENV !== "production"` ou si `ENABLE_API_DOCS=true`. La spécification OpenAPI brute est servie sur `/docs/json`.

---

## Authentification

### `POST /api/v1/auth/login`

**Accès** : Public (limité à 8 tentatives par 15 minutes)

**Corps**

| Champ | Type | Règles |
|---|---|---|
| `email` | string | E-mail valide, insensible à la casse |
| `password` | string | Non vide |

```json
{ "email": "admin@example.com", "password": "motdepasse" }
```

**Réponse 200** : pose le cookie `ohmflow.sid`.

```json
{ "user": { "id": "clx…", "firstName": "Jeanne", "lastName": "Dupont", "email": "admin@example.com", "role": "ADMIN", "cellId": null } }
```

**Erreurs**
- `401` `Adresse e-mail ou mot de passe incorrect` : e-mail inconnu, compte inactif ou mauvais mot de passe. Le message est le même dans les trois cas.
- `429` : trop de tentatives.

**Exemple**

```bash
curl -i -c cookies.txt -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"motdepasse"}' \
  http://localhost:4000/api/v1/auth/login
```

Les exemples suivants réutilisent le cookie avec `-b cookies.txt`.

### `POST /api/v1/auth/logout`

**Accès** : Connecté

Détruit la session et efface le cookie.

**Réponse 204** : sans corps.

### `GET /api/v1/auth/me`

**Accès** : Connecté

**Réponse 200**

```json
{ "user": { "id": "clx…", "firstName": "Jeanne", "lastName": "Dupont", "email": "admin@example.com", "role": "ADMIN", "cellId": null } }
```

**Erreurs** : `401` si la session est absente ou expirée.

---

## Tableau de bord

### `GET /api/v1/dashboard`

**Accès** : Connecté. Les chiffres sont calculés sur le [périmètre de visibilité](#visibilité-des-tickets) de l'utilisateur.

**Réponse 200**

```json
{
  "metrics": {
    "total": 120,
    "open": 30,
    "inProgress": 45,
    "waiting": 10,
    "resolved": 25,
    "unassigned": 12,
    "activeUsers": 18
  },
  "recent": [ /* 8 derniers tickets modifiés, format TicketListItem */ ]
}
```

| Champ | Détail |
|---|---|
| `unassigned` | Tickets `OPEN` sans agent. Toujours `0` pour `USER`. |
| `activeUsers` | Nombre de comptes actifs. `null` sauf pour `ADMIN`. |

---

## Tickets

### Statuts et transitions

| Statut | Transitions autorisées |
|---|---|
| `OPEN` | → `IN_PROGRESS` |
| `IN_PROGRESS` | → `WAITING`, `RESOLVED`, `OPEN` |
| `WAITING` | → `IN_PROGRESS`, `RESOLVED`, `OPEN` |
| `RESOLVED` | → `CLOSED`, `IN_PROGRESS` |
| `CLOSED` | → `IN_PROGRESS` |

### `GET /api/v1/tickets`

**Accès** : Connecté (limité au périmètre de visibilité)

**Paramètres de requête**

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `q` | string (≤ 120) | | Recherche insensible à la casse dans `reference`, `title`, `pdlPce` et `haulogyTicketNumber`. |
| `status` | `OPEN` \| `IN_PROGRESS` \| `WAITING` \| `RESOLVED` \| `CLOSED` | | Filtre par statut. |
| `available` | `true` \| `false` | | Avec `true` : seulement les tickets non affectés ou affectés à l'utilisateur courant. |
| `page` | entier ≥ 1 | `1` | |
| `pageSize` | entier de 1 à 100 | `20` | |

Les tickets sont triés par `updatedAt` décroissant.

**Réponse 200** : liste paginée de [`TicketListItem`](#ticketlistitem).

```bash
curl -b cookies.txt "http://localhost:4000/api/v1/tickets?q=TCK-2026&status=OPEN&page=1&pageSize=20"
```

### `POST /api/v1/tickets`

**Accès** : Connecté (tous les rôles)

**Corps**

| Champ | Type | Obligatoire | Règles |
|---|---|---|---|
| `title` | string | oui | 3 à 160 caractères |
| `description` | string | oui | 10 à 10 000 caractères |
| `cellId` | string | oui | Cellule active d'un service actif |
| `categoryId` | string | oui | Catégorie active |
| `grdId` | string | oui | GRD actif |
| `pdlPce` | string \| null | non | ≤ 50 caractères, une chaîne vide est enregistrée comme `null` |
| `haulogyTicketNumber` | string \| null | non | ≤ 50 caractères, une chaîne vide est enregistrée comme `null` |

```json
{
  "title": "Index de relève incohérent",
  "description": "L'index transmis par le GRD ne correspond pas au relevé client.",
  "cellId": "clx_cell",
  "categoryId": "clx_cat",
  "grdId": "clx_grd",
  "pdlPce": "14123456789012",
  "haulogyTicketNumber": "HLG-4521"
}
```

**Effets**
- Génère une référence unique `TCK-<année>-<numéro sur 5 chiffres>` (ex. `TCK-2026-00042`).
- Statut initial `OPEN`, créateur = utilisateur courant, `version = 1`.
- Ajoute une entrée d'historique de statut (`→ OPEN`).

**Réponse 201**

```json
{ "ticket": { /* Ticket avec cell (+service), category, grd, creator */ } }
```

**Erreurs** : `400` si la cellule, la catégorie ou le GRD est introuvable ou inactif, ou si la validation échoue.

### `GET /api/v1/tickets/:id`

**Accès** : Connecté, ticket dans le périmètre de visibilité

**Réponse 200** : [`TicketDetail`](#ticketdetail), qui contient l'historique des statuts, l'historique des affectations et les commentaires, triés par date croissante.

**Erreurs** : `404` `Ticket introuvable` (inexistant ou hors périmètre).

### `PATCH /api/v1/tickets/:id`

**Accès** : le **créateur** du ticket uniquement, quel que soit son rôle

**Corps** : tous les champs sont obligatoires, le ticket est remplacé en entier.

| Champ | Type | Règles |
|---|---|---|
| `title` | string | 3 à 160 caractères |
| `description` | string | 10 à 10 000 caractères |
| `cellId` | string | Cellule active d'un service actif |
| `categoryId` | string | Catégorie active |
| `grdId` | string | GRD actif, **ou** GRD actuel du ticket même s'il a été désactivé depuis |
| `pdlPce` | string \| null | ≤ 50 caractères |
| `haulogyTicketNumber` | string \| null | ≤ 50 caractères |
| `version` | entier > 0 | Version lue par le client |

**Réponse 200** : `{ "ticket": TicketListItem }`

**Erreurs**
- `404` : ticket inexistant ou utilisateur qui n'en est pas le créateur.
- `409` : ticket `RESOLVED` ou `CLOSED`, version obsolète ou modification simultanée.
- `400` : référentiel inactif ou validation échouée.

### `POST /api/v1/tickets/:id/claim`

**Accès** : `AGENT` autorisé sur la cellule du ticket

Prend en charge un ticket de façon atomique : `assigneeId` devient l'agent courant et le statut passe de `OPEN` à `IN_PROGRESS`. L'affectation et le changement de statut sont historisés.

**Corps** : aucun.

**Réponse 200** : `{ "ticket": Ticket }` (sans relations)

**Erreurs**
- `404` : ticket inexistant ou hors des cellules de l'agent.
- `409` : ticket déjà affecté, statut différent de `OPEN`, ou ticket pris en charge par un autre agent au même moment.

### `PATCH /api/v1/tickets/:id/assignment`

**Accès** : `ADMIN`

**Corps**

| Champ | Type | Description |
|---|---|---|
| `agentId` | string \| null | Agent à affecter, ou `null` pour désaffecter. |
| `version` | entier > 0 | Version lue par le client. |

**Effets**
- L'agent doit avoir le rôle `AGENT`, être actif et être autorisé sur la cellule du ticket.
- Si un agent est affecté à un ticket `OPEN`, le statut passe à `IN_PROGRESS` (historisé avec le commentaire « Affectation par un administrateur »).
- L'affectation est historisée (`fromId` → `toId`).

**Réponse 200** : `{ "ticket": Ticket + assignee }`

**Erreurs** : `400` agent non éligible, `404` ticket introuvable, `409` version obsolète ou modification simultanée.

### `PATCH /api/v1/tickets/:id/status`

**Accès** : `ADMIN`, ou `AGENT` **affecté** au ticket

**Corps**

| Champ | Type | Obligatoire | Règles |
|---|---|---|---|
| `status` | TicketStatus | oui | Doit respecter la [table des transitions](#statuts-et-transitions) |
| `comment` | string | non | ≤ 2 000 caractères, enregistré dans l'historique |
| `version` | entier > 0 | oui | Version lue par le client |

```json
{ "status": "RESOLVED", "comment": "Index corrigé par le GRD", "version": 3 }
```

**Effets sur `resolvedAt`**
- Passage à `RESOLVED` : `resolvedAt` reçoit la date du jour.
- Passage à `CLOSED` : `resolvedAt` est conservé.
- Tout autre statut : `resolvedAt` est remis à `null`.

**Réponse 200** : `{ "ticket": Ticket }`

**Erreurs**
- `403` : agent qui n'est pas affecté au ticket.
- `404` : ticket introuvable ou hors périmètre.
- `409` : transition interdite (`Transition X vers Y interdite`), version obsolète ou modification simultanée.

---

## Commentaires

### `GET /api/v1/tickets/:id/comments`

**Accès** : Connecté, ticket dans le périmètre

**Réponse 200**

```json
{ "items": [ { "id": "…", "ticketId": "…", "authorId": "…", "content": "…", "createdAt": "…", "author": SafeUser } ] }
```

Les commentaires sont triés par date croissante.

### `POST /api/v1/tickets/:id/comments`

**Accès** : Connecté, ticket dans le périmètre. Un `USER` ne peut commenter **que les tickets qu'il a créés**.

**Corps**

| Champ | Type | Règles |
|---|---|---|
| `content` | string | 1 à 4 000 caractères |

**Réponse 201** : `{ "comment": TicketComment + author }`

**Erreurs** : `403` `Seul le créateur du ticket peut commenter` (USER), `404` ticket hors périmètre.

---

## Référentiels

Règle commune : pour les rôles autres que `ADMIN`, les listes ne renvoient que les éléments actifs (`isActive: true`). Les éléments ne sont jamais supprimés : on les désactive avec `isActive: false`.

### Services

#### `GET /api/v1/services`

**Accès** : Connecté

**Réponse 200** : `{ "items": [ Service + cells[] ] }`, triés par nom. Pour un non-admin, seuls les services actifs et leurs cellules actives sont renvoyés.

#### `POST /api/v1/services`

**Accès** : `ADMIN`

| Champ | Type | Obligatoire | Règles |
|---|---|---|---|
| `name` | string | oui | ≥ 2 caractères, unique |
| `description` | string | non | ≤ 1 000 caractères |

**Réponse 201** : `{ "service": Service }`. **Erreurs** : `409` si le nom existe déjà.

#### `PATCH /api/v1/services/:id`

**Accès** : `ADMIN`. Tous les champs sont facultatifs.

| Champ | Type | Règles |
|---|---|---|
| `name` | string | ≥ 2 caractères, unique |
| `description` | string \| null | ≤ 1 000 caractères |
| `isActive` | boolean | |

**Réponse 200** : `{ "service": Service }`. **Erreurs** : `404` introuvable, `409` nom en double.

### Cellules

#### `GET /api/v1/cells`

**Accès** : Connecté

**Réponse 200** : `{ "items": [ Cell + service ] }`. Seules les cellules **actives** sont renvoyées, y compris pour un `ADMIN`. Pour voir les cellules inactives, utiliser `GET /services`.

#### `POST /api/v1/cells`

**Accès** : `ADMIN`

| Champ | Type | Obligatoire | Règles |
|---|---|---|---|
| `name` | string | oui | ≥ 2 caractères |
| `description` | string | non | ≤ 1 000 caractères |
| `serviceId` | string | oui | Service existant |

**Réponse 201** : `{ "cell": Cell }`. **Erreurs** : `400` service introuvable.

#### `PATCH /api/v1/cells/:id`

**Accès** : `ADMIN`. Tous les champs sont facultatifs : `name`, `description` (string \| null), `serviceId`, `isActive`.

**Réponse 200** : `{ "cell": Cell }`. **Erreurs** : `404` introuvable.

### GRD (gestionnaires de réseau de distribution)

#### `GET /api/v1/grds`

**Accès** : Connecté. **Réponse 200** : `{ "items": [ Grd ] }`, triés par nom.

#### `POST /api/v1/grds`

**Accès** : `ADMIN`

| Champ | Type | Obligatoire | Règles |
|---|---|---|---|
| `name` | string | oui | 2 à 80 caractères, unique |
| `description` | string | non | ≤ 500 caractères |

**Réponse 201** : `{ "grd": Grd }`. **Erreurs** : `409` nom en double.

#### `PATCH /api/v1/grds/:id`

**Accès** : `ADMIN`. Champs facultatifs : `name` (2 à 80), `description` (string \| null, ≤ 500), `isActive`.

**Réponse 200** : `{ "grd": Grd }`. **Erreurs** : `404`, `409`.

### Catégories de ticket

#### `GET /api/v1/ticket-categories`

**Accès** : Connecté. **Réponse 200** : `{ "items": [ TicketCategory ] }`, triées par nom.

#### `POST /api/v1/ticket-categories`

**Accès** : `ADMIN`. Mêmes champs et règles que pour les GRD (`name` de 2 à 80 caractères et unique, `description` ≤ 500).

**Réponse 201** : `{ "category": TicketCategory }`.

#### `PATCH /api/v1/ticket-categories/:id`

**Accès** : `ADMIN`. Champs facultatifs : `name`, `description` (string \| null), `isActive`.

**Réponse 200** : `{ "category": TicketCategory }`.

---

## Utilisateurs

### `GET /api/v1/users`

**Accès** : `ADMIN`

**Paramètres de requête**

| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `q` | string | | Recherche insensible à la casse dans le prénom, le nom et l'e-mail. |
| `role` | `ADMIN` \| `USER` \| `AGENT` | | Filtre par rôle. |
| `page` | entier ≥ 1 | `1` | Taille de page fixe : 25. |

Les utilisateurs sont triés par nom de famille.

**Réponse 200**

```json
{
  "items": [
    {
      "id": "…", "firstName": "…", "lastName": "…", "email": "…",
      "role": "AGENT", "isActive": true,
      "cell": null,
      "agentCells": [ { "agentId": "…", "cellId": "…", "createdAt": "…", "cell": Cell } ],
      "createdAt": "…", "updatedAt": "…"
    }
  ],
  "total": 18, "page": 1, "pageSize": 25
}
```

### `POST /api/v1/users`

**Accès** : `ADMIN`

| Champ | Type | Obligatoire | Règles |
|---|---|---|---|
| `firstName` | string | oui | Non vide |
| `lastName` | string | oui | Non vide |
| `email` | string | oui | E-mail valide et unique, enregistré en minuscules |
| `password` | string | oui | ≥ 12 caractères (haché en argon2id) |
| `role` | `ADMIN` \| `USER` \| `AGENT` | oui | |
| `cellId` | string | si `USER` | Cellule de rattachement |
| `agentCellIds` | string[] | si `AGENT` (au moins un) | Cellules que l'agent peut traiter |

**Réponse 201** : `{ "user": SafeUser }`

**Erreurs** : `400` USER sans cellule, AGENT sans cellule autorisée ou cellule inexistante. `409` e-mail déjà utilisé.

### `PATCH /api/v1/users/:id`

**Accès** : `ADMIN`. Tous les champs sont facultatifs.

| Champ | Type | Règles |
|---|---|---|
| `firstName`, `lastName` | string | Non vide |
| `email` | string | E-mail valide et unique |
| `role` | `ADMIN` \| `USER` \| `AGENT` | |
| `cellId` | string \| null | |
| `isActive` | boolean | |
| `agentCellIds` | string[] | **Remplace** la liste complète des cellules autorisées |
| `newPassword` | string | 12 à 128 caractères |
| `confirmNewPassword` | string | Obligatoire avec `newPassword` et identique à celui-ci |

**Règles métier**
- Impossible de désactiver ou de rétrograder le **dernier administrateur actif** (`409`).
- Un `USER` doit garder une cellule (`400`).
- Un `AGENT` doit garder au moins une cellule autorisée (`400`).
- Si le rôle final n'est pas `AGENT`, toutes les autorisations de cellule d'agent sont supprimées.
- Changer le mot de passe **déconnecte toutes les sessions** de l'utilisateur.

**Réponse 200**

```json
{ "user": { "id": "…", "firstName": "…", "lastName": "…", "email": "…", "role": "USER", "isActive": true, "cellId": "…" } }
```

**Erreurs** : `400`, `404` utilisateur introuvable, `409` dernier admin ou e-mail en double.

### `DELETE /api/v1/users/:id`

**Accès** : `ADMIN`

**Désactivation logique** (`isActive = false`) : l'utilisateur n'est pas supprimé de la base et ses sessions deviennent invalides.

**Réponse 204** : sans corps.

**Erreurs** : `404` introuvable, `409` dernier administrateur actif.

---

## Annexe : objets renvoyés

Les dates sont au format ISO 8601 et les identifiants sont des `cuid`.

### SafeUser

```json
{ "id": "…", "firstName": "…", "lastName": "…", "email": "…", "role": "ADMIN | USER | AGENT", "cellId": "… | null" }
```

### Service, Cell, Grd, TicketCategory

```json
{ "id": "…", "name": "…", "description": "… | null", "isActive": true, "createdAt": "…", "updatedAt": "…" }
```

`Cell` contient en plus `serviceId`.

### Ticket

```json
{
  "id": "…",
  "reference": "TCK-2026-00042",
  "title": "…",
  "description": "…",
  "status": "OPEN | IN_PROGRESS | WAITING | RESOLVED | CLOSED",
  "categoryId": "… | null",
  "grdId": "… | null",
  "pdlPce": "… | null",
  "haulogyTicketNumber": "… | null",
  "cellId": "…",
  "creatorId": "…",
  "assigneeId": "… | null",
  "resolvedAt": "… | null",
  "version": 1,
  "createdAt": "…",
  "updatedAt": "…"
}
```

### TicketListItem

`Ticket` avec les relations suivantes :

```json
{
  "...": "champs de Ticket",
  "cell": { "...": "Cell", "service": "Service" },
  "category": "TicketCategory | null",
  "grd": "Grd | null",
  "creator": "SafeUser",
  "assignee": "SafeUser | null"
}
```

### TicketDetail

`TicketListItem` avec, en plus :

```json
{
  "statusHistory": [ { "id": "…", "ticketId": "…", "actorId": "…", "from": "OPEN | null", "to": "IN_PROGRESS", "comment": "… | null", "createdAt": "…", "actor": "SafeUser" } ],
  "assignmentHistory": [ { "id": "…", "ticketId": "…", "actorId": "…", "fromId": "… | null", "toId": "… | null", "createdAt": "…", "actor": "SafeUser" } ],
  "comments": [ { "id": "…", "ticketId": "…", "authorId": "…", "content": "…", "createdAt": "…", "author": "SafeUser" } ]
}
```
