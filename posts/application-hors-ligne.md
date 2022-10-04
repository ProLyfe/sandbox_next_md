---
layout: blog-post
categories: [ blog-post ]
title: "Comment développer une application web disponible hors ligne ? Usages avancés"
metaDescription:  Développement d'une progressive web app (PWA) disponible hors ligne Usages avancés
author: "Loïc BOURG"
twitter_id: "LoicBourg63"
featured_img: "/images/posts/cover.png"
date: "2022-04-21 14:00:00"
description: |
    Maintenant que vous avez votre service worker fonctionnel avec une première fonctionnalité développée (mise en hors ligne des pages), il va falloir l’améliorer !
tags: [ PWA, service workers, offline, Next.js ]
---
<br />
*Cet article est la suite d'un article d'introduction aux service worker. <br />
Si vous n'êtes pas familier avec cette technologie, prenez le temps de lire l'article précédent !* <br />
[Installation et configuration](/blog-post/2022/01/17/application-web-hors-ligne.html)

Si vous voulez uniquement voir à quoi ressemble le code final: [rendez-vous ici](https://github.com/loicbourg/nextjs-offline-example)

Maintenant que nous avons notre service worker fonctionnel avec une première fonctionnalité développée (mise en hors ligne des pages), il va falloir l’améliorer !

## Page de remplacement hors ligne

Vous pouvez maintenant afficher à l’utilisateur les pages qu’il a visitées lorsqu’il est hors ligne, mais comment améliorer son expérience lorsqu’il
navigue sur une page qu’il n’a jamais visitée ?

Nous allons faire en sorte d’afficher une page “hors ligne” spécifique à l’application au lieu d’afficher l’erreur de connexion classique du navigateur.

Pour cela nous allons utiliser le système de [precache](https://developer.chrome.com/docs/workbox/modules/workbox-precaching/) de workbox.
Cette fonctionnalité va nous permettre d’indiquer à notre service worker des éléments à mettre en cache à utiliser plus tard.

La première chose à faire est d’installer le module
```
yarn add workbox-precaching
```

Nous pouvons ensuite l’ajouter dans les modules workbox à mettre dans le dossier public


```js
// service-worker.js
workbox.loadModule('workbox-precaching');
```

Nous allons ensuite créer la page à afficher à l’utilisateur lorsqu’il est hors ligne dans pages/offline.js, ce qui va créer une page disponible à l’url /offline.

```jsx
// pages/offline.js
export default function Offline() {
 return <><h1>
   Vous êtes hors ligne !
 </h1>

   <p>
     Pour vous consoler voilà un cookie =&gt; 🍪
   </p>
 </>
}
```

Maintenant que nous avons notre page, il va falloir indiquer à notre service worker quelle est la page à mettre dans le precache ainsi que les fichiers JavaScript dont elle a besoin.


Il est possible d’envoyer des informations au service worker lorsqu’il démarre en ajoutant des paramètres GET pendant son chargement.
C’est ce que nous allons faire pour indiquer les fichiers JavaScript dont a besoin la page hors ligne en utilisant les informations présentes dans \_\_NEXT_DATA__ et __BUILD_MANIFEST

```js
// pages/_app.js
window.addEventListener('load', function () {
let queryString = `buildId=${__NEXT_DATA__.buildId}`;
// __BUILD_MANIFEST can be undefined and only have the loaded route in dev mode
if (
 typeof __BUILD_MANIFEST !== 'undefined' &&
 typeof __BUILD_MANIFEST['/offline'] !== 'undefined'
) {
 queryString = `${queryString}&offlineScripts=${__BUILD_MANIFEST[
   '/offline'
 ].join(',')}`;
}

workbox = new Workbox(`/service-worker.js?${queryString}`);
});

```

Nous pouvons ensuite récupérer ces informations en utilisant l’API JavaScript [URL](https://caniuse.com/url) du navigateur.

```js
// service-worker.js
const urlSearchParams = new URL(location).searchParams;
```

Puis mettre la page hors ligne et ses dépendances dans le cache.

```js
// service-worker.js
const buildId = urlSearchParams.get('buildId');
if (!buildId) {
  return;
}
workbox.precaching.precacheAndRoute([{ url: '/offline', revision: buildId }]);

const offlineScripts = urlSearchParams.get('offlineScripts');
if (!offlineScripts) {
  return;
}
for (let offlineScript of offlineScripts.split(',')) {
 workbox.precaching.precacheAndRoute([
   { url: '/_next/' + offlineScript, revision: buildId },
 ]);
}
```

**Note: le buildId permet d’indiquer la version du cache, afin de mettre à jour la page hors ligne lors d’un nouveau build Next.js**

Maintenant que nous avons notre precache, il ne nous reste plus qu'à l'utiliser lorsqu’une requête d’affichage de page HTML échoue.

```js
// service-worker.js
workbox.routing.setCatchHandler(event => {
 switch (event.request.destination) {
   case 'document':
     return workbox.precaching.matchPrecache('/offline');
 }
});
```

### Test du fonctionnement
Next.js ne construit pas toutes les pages en dev pour ne pas avoir un temps de démarrage trop long.

Cela pose problème dans notre cas étant donné que nous avons besoin de connaître les informations de la page en consultant la variable __BUILD_MANIFEST.

**Pensez à supprimer le cache de votre application (Application -> Storage -> Clear site data sur google chrome)**

une fois que c’est fait

```js
yarn run build
yarn run start
```

1. Allez sur localhost:3000
2. Mettez vous en hors ligne
3. Allez sur localhost:3000/jenaijamaisvisitecettepage

✨ TADA ✨ vous avez maintenant la page hors ligne qui s'affiche !

## Gestion de la navigation côté client
Vous l’avez peut être déjà remarqué: l’implémentation actuelle de la disponibilité des pages en hors ligne présente un problème : elle ne met pas en cache les pages lorsque la navigation s’est faite côté client (appui sur lien next ou appel à router.push()).

Enlevons cette limitation !


### Le problème
La navigation côté client de Next.js ne fait que des requêtes HTTP pour récupérer le JavaScript nécessaire à la page et les données renvoyées par getServerSideProps.

Etant donné qu’aucune requête de document n’a été faite, la page n’est pas mise en cache. Il va donc falloir construire nous même le cache de cette page lorsque ce type de navigation se produit.

### La solution
L'approche la moins complexe consiste à déclencher un appel http depuis le service worker pour mettre en cache la page comme dans [cet exemple](https://github.com/shadowwalker/next-pwa/tree/master/examples/cache-on-front-end-nav). <br />
Cela pose cependant plusieurs problèmes étant donné que chaque navigation coté client va déclencher un appel http sur la nouvelle url:
- Augmentation de la charge serveur
- Consommation de bande passante plus élevée pour l’utilisateur

Pour régler ce problème, nous allons plutôt mettre en cache le squelette de la page avec uniquement les balises scripts des fichiers JavaScript à charger.

Le thread principal va donc devoir communiquer au service worker les informations nécessaires pour mettre en cache le squelette de la page courante à chaque navigation client.
Workbox fournit ce qu’il faut pour effectuer cette communication: [messageSW](https://developer.chrome.com/docs/workbox/modules/workbox-window/)

La première étape va être de connaître les fichiers Javascript de base nécessaires au fonctionnement de Next.js. <br />
Une solution pour les connaître est de [créer un Document next.js spécifique](https://nextjs.org/docs/advanced-features/custom-document) puis d’ajouter le composant script suivant dans le render

```jsx
{% raw %}
<script
 type="application/json"
 id="__NEXT_BASE_FILES__"
 crossOrigin="anonymous"
 dangerouslySetInnerHTML={{
     __html: JSON.stringify({
     lowPriority: this.props.buildManifest?.lowPriorityFiles,
     base: this.props.buildManifest.pages?.['/_app'],
   })
 }}
/>
{% endraw %}
```

Une fois que nous avons cette information mise à disposition, nous allons pouvoir ajouter le listener en charge de donner les informations de mise en cache au service worker 

[Voir le code sur github](https://github.com/loicbourg/nextjs-offline-example/blob/6a7bd17a04f7c474eee4c6db6da1c99815a139d1/networkStatus.js#L30-L63)

Explication de tous les éléments étant envoyés au service worker:
- type : permet d’indiquer le type de message pour que notre service worker puisse comprendre son but
- url : Url ou doit être stocké le cache
- pageProps : les props données à la page
- page : la page Next.js utilisée pour rendre cette url
- query : les informations de query présentes dans le router
- nextData : informations de base présentes dans le script \_\_NEXT_DATA__ (publicRuntimeConfig, …)
- nextBaseScripts : fichiers JavaScript nécessaires au fonctionnement de base de Next.js
- chunkScripts : fichiers JavaScripts spécifiques à la page rendue


Une fois le message envoyé, le service worker doit s’occuper de construire la page à partir des informations fournies et de la mettre en cache.

[Voir le code sur github](https://github.com/loicbourg/nextjs-offline-example/blob/6a7bd17a04f7c474eee4c6db6da1c99815a139d1/public/service-worker.js#L172-L222)

Maintenant que nous avons notre communication en place plus de problèmes de navigation côté client ne générant pas de mise en cache !

## Indiquer à l’utilisateur qu’il voit du contenu hors ligne
Maintenant que nous avons notre application ayant une bonne prise en charge du hors ligne, il faudrait pouvoir indiquer à l’utilisateur qu’il voit une page en cache.

Workbox dispose d’un principe de plugin permettant de réagir à différents moments du cycle de vie de chacune des routes de cache définies.

Nous allons créer un plugin permettant d’envoyer un message au JavaScript tournant sur le thread principal lorsqu’une réponse en cache a été utilisée pour récupérer les données de la page (getServerSideProps) ou l’affichage entier d’une page (première navigation sur une url de l’application)

[Voir le code sur github](https://github.com/loicbourg/nextjs-offline-example/blob/6a7bd17a04f7c474eee4c6db6da1c99815a139d1/public/service-worker.js#L25-L83)

Nous pouvons ensuite créer un hook écoutant le message du service worker et mettant à jour un état lorsqu’un message est recu. 

[Voir le code sur github](https://github.com/loicbourg/nextjs-offline-example/blob/6a7bd17a04f7c474eee4c6db6da1c99815a139d1/networkStatus.js#L65-L135)

Il ne reste plus qu’à appeler ce hook dans _app.js et nous pouvons alerter l'utilisateur qu’il voit une réponse provenant du cache hors ligne.

[Voir le code sur github](https://github.com/loicbourg/nextjs-offline-example/blob/6a7bd17a04f7c474eee4c6db6da1c99815a139d1/pages/_app.js#L6)

## Conclusion
Comme vous avez pu le voir dans cette deuxième partie d’article, les service worker offrent beaucoup de nouvelles possibilités pour améliorer l’expérience utilisateur afin de se rapprocher d’une expérience native.

[Cela ouvre aussi de nouvelles possibilités au niveau des stratégies de test](https://github.com/mswjs/msw)

Cependant, [Il est également possible de créer toutes sortes de nouveaux bug si on ne fait pas attention](https://medium.com/imgur-engineering/solving-cache-first-bug-recovery-in-service-workers-3298bb71af4e)

Donc n’oubliez pas:

![un grand pouvoir implique de grandes responsabilités]({{ "/assets/medias/img/blog/application-web-hors-ligne-partie-2/output_01.png" }}) 