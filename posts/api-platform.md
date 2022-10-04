---
layout: blog-post
categories: [ blog-post ]
title: "API Platform"
metaDescription: Prise en main d'API Platform
author: "Benoît Petitcollot"
featured_img: "/images/posts/microscope.png"
title_img: "felixioncool - https://pixabay.com/fr/photos/microscope-recherche-laboratoire-385364/"
date: "2022-07-22 13:37:00"
description: |
    Prise en main d'API Platform en mode prototypage rapide.
tags: [ RAD, API, Symfony, React ]
---

## Pourquoi utiliser API Platform ?

Créer une application web dans les règles de l'art prend un certain temps. Un coût qui est notamment lié à la qualité du code (robuste, maintenable...) et la sécurité des données, garantis par l'écriture de tests.

Certains de nos clients se sont tournés vers des solutions nocode pour répondre à des besoins internes de gestion de données ou d'automatisation de tâches. Ces outils tentent de permettre le développement d'applications web sans avoir besoin d'apprendre un langage de programmation : il suffit de savoir cliquer, glisser-déposer et de configurer des actions à travers quelques formulaires et boîtes de dialogues pour obtenir rapidement un résultat fonctionnel.

Après une période de tests, nous n'avons pas été convaincus par ces outils au delà de certains cas d'utilisation assez simples.

Cependant, nous avions besoin de nous positionner face à la concurrence des outils nocode qui mettent en avant une extrême rapidité de mise en place. Nous avons donc plutôt recherché une solution de Rapid Application Development qui nous permettrait de réaliser beaucoup plus rapidement un prototype ou une première version d'application tout en nous permettant de faire évoluer par la suite le produit vers nos critères de qualité.

Nous n'avions jamais testé [API Platform](https://api-platform.com) mais nous étions à l'écoute de ce qui s'en disait au sein de la communauté PHP. C'était le moment de prendre en main cet outil pour voir s'il pouvait correspondre à notre besoin.

## Le projet

Afin de tester API Platform en conditions réelles, j'ai redéveloppé une petite application dans laquelle nous évaluons le temps passé aux différentes tâches que nous exécutons au jour le jour. C'est une application assez simple mais qui mobilise quelques fondamentaux du développement web :

- stockage en base de données assorti d'un CRUD
- utilisation soumise à authentification
- interrogation d'une API externe (l'API de Github pour récupérer les intitulés des issues)
- un peu d'ergonomie sur les formulaires

Les buts de l'exercice étaient donc les suivants :

- prendre en main API Platform et les pratiques recommandées par [sa documentation](https://api-platform.com/docs)
- évaluer le temps minimal nécessaire pour obtenir un outil fonctionnel
- s'assurer de l'évolutivité du produit obtenu

## Prise en main

| Nos habitudes | API Platform |
|---|---|
| Symfony | Entièrement intégré au framework et utilise de nombreux composants Symfony |
| ORM Doctrine | Intégration de plusieurs couches de persistance dont Doctrine |
| Command bus avec Tactician | Recommande plutôt d'utiliser le composant Symfony Messenger |
| RabbitMQ avec consumer Swarrot | Symfony Messenger |
| Authentification JWT | API Platform laisse au développeur le soin de gérer la sécurité |
| React et NextJS | [React Admin](https://marmelab.com/react-admin/) et plusieurs générateurs d'applications avec différents frameworks dont NextJS |

Avec API Platform, nous sommes donc largement en terrain connu. Certaines spécificités nécessitent tout de même une prise en main :

- Exit les Controllers Symfony. API Platform propose des attributs PHP pour configurer les ressources d'API et se charge de générer les routes correspondantes. La logique métier doit être embarquée dans des DataProviders et DataPersisters qui font le lien entre les entités Doctrine et les ressources d'API.
- L'attribut ApiResource expose beaucoup de paramètres de configuration pour activer / désactiver les actions présentes par défaut sur chaque endpoint, activer des filtres, activer GraphQL, etc.
- La documentation recommande de ne pas utiliser la même classe comme entité et comme ApiResource. Des DataProviders Doctrine sont cependant implémentés pour fonctionner avec des classes entité-ressource dans une optique de RAD. Il vaut mieux avoir les idées claires pour faire la part des choses dans les exemples proposés tout au long de la documentation.
- API Platform propose un paquet complémentaire à React Admin pour le faire communiquer avec l'API. Il faut également se familiariser avec les concepts de React Admin, les hooks de [react-hook-form](https://react-hook-form.com/) et la surcouche d'API Platform. Il vaut donc mieux avoir déjà une compréhension du fonctionnement de React.

## Développement initial

### Installation des bibliothèques PHP

- On installe Symfony

```
$ symfony new timetrackor
$ cd timetrackor
```

- On ajoute API Platform

```
$ composer require api
```

- Un bundle pour gérer l'authentification JWT

```
$ composer require lexik/jwt-authentication-bundle
```

### Création du modèle de données

A ce stade, API Plaform est fonctionnel mais il manque des données à exposer. On crée un User, une classe pour les temps passés et on lie le mécanisme d'authentification à la classe User.

Voici les fichiers que j'ai eu à créer / modifier :

```
 .env                                                |   4 ++--
 config/packages/doctrine.yaml                       |   2 ++
 config/packages/nelmio_cors.yaml                    |   7 +++++++
 config/packages/security.yaml                       |  28 +++++++++++++++++++---------
 config/routes.yaml                                  |   3 +++
 config/services.yaml                                |   9 +++++++++
 migrations/Version20220610070946.php                |  35 +++++++++++++++++++++++++++++++++++
 migrations/Version20220610080031.php                |  36 ++++++++++++++++++++++++++++++++++++
 src/DataPersister/WorkingTimePersister.php          |  35 +++++++++++++++++++++++++++++++++++
 src/DataProvider/WorkingTimeProvider.php            |  10 ++++++++++
 src/Entity/User.php                                 | 121 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 src/Entity/WorkingTime.php                          | 129 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 src/EventListener/AuthenticationSuccessListener.php |  29 +++++++++++++++++++++++++++++
 src/Repository/UserRepository.php                   |  66 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 src/Repository/WorkingTimeRepository.php            |  66 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 15 files changed, 569 insertions(+), 11 deletions(-)
```

### Installation de l'admin API Platform

On installe ensuite l'interface d'administration.

```
$ yarn create react-app my-admin
$ cd my-admin
$ yarn add @api-platform/admin
```

### Personnalisation de l'admin

L'admin est immédiatement fonctionnelle mais il manque la gestion de la logique d'authentification et un peu de personnalisation pour rendre le formulaire de saisie un minimum ergonomique (Formattage de certains champs et connexion à l'API de Github pour récupérer les issues triées par projets)


```
 my-admin/src/App.js                          |  92 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---------------------
 my-admin/src/components/WorkingTimeCreate.js | 178 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 my-admin/src/components/WorkingTimeList.js   |  10 +++++++++
 my-admin/src/github/githubAPIClient.js       |  34 ++++++++++++++++++++++++++++++
 my-admin/src/security/authProvider.js        |  40 ++++++++++++++++++++++++++++++++++++
 5 files changed, 331 insertions(+), 23 deletions(-)
```

## Résultat

Exception faite du temps de montée en compétence, j'ai donc obtenu une première version utilisable avec quelques lignes de commande et 900 lignes de code, ce qui doit être réalisable en une journée de travail.

J'ai ensuite pris le temps d'écrire quelques tests pour vérifier le fonctionnement de certains aspects qui n'étaient pas couverts par ce petit projet de test :

- La finesse des droits d'accès aux données par utilisateur
- La gestion des sous-ressources
- Les champs calculés
- Les filtres avec ou sans paramètres
- Le support GraphQL

J'ai assez facilement trouvé réponse à mes questions dans la documentation et je n'ai pas trouvé de point bloquant ou excessivement compliqué à résoudre.

## Conclusion

Au final, la prise en main nécessite certes d'être familier de l'écosystème Symfony et de React. Quelques jours sont nécessaires pour assimiler les concepts et les fonctionnements spécifiques d'API Platform.

Pour autant, je n'ai pas eu le sentiment d'être prisonnier des choix de la bibliothèque. Les services présents de base peuvent être décorés ou tout simplement remplacés ce qui assure de pouvoir personnaliser à l'envie le fonctionnement de l'API.

En dehors de l'authentification, il n'y a quasiment rien à écrire soi-même pour obtenir un résultat fonctionnel. Des DataProviders sont disponibles pour Doctrine mais aussi MongoDB et ElasticSearch. De nombreux filtres sont également implémentés en tant que services. Les principaux formats d'échange sont supportés (JSON-LD, JSON:API...).

C'est donc une expérience encourageante. Il est fort probable que nous utilisions API Platform pour l'un de nos futurs projets.

*[CRUD]: Cread Read Update Delete
*[RAD]: Rapid Application Development
*[ORM]: Object-Relational Mapping