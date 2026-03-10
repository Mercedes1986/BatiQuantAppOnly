<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BatiQuant

Base front-end Vite/React de l’application BatiQuant.

Cette version a été nettoyée pour préparer une intégration **AdMob mobile** côté Android/iOS natif :
- la logique **AdSense web** a été retirée ;
- les emplacements pub React restent présents comme **placeholders techniques** ;
- le consentement reste géré côté application, sans chargement GTM/AdSense ;
- l’intégration réelle d’**AdMob** devra être faite dans la couche native Android/iOS.

## Prérequis

- Node.js 20+
- npm

## Installation locale

1. Installer les dépendances :
   `npm install`
2. Lancer le serveur de développement :
   `npm run dev`
3. Vérifier le typage :
   `npm run typecheck`
4. Générer le build :
   `npm run build`

## Variables d’environnement utiles

Créer un fichier `.env.local` si nécessaire.

Exemples :

```env
VITE_BUILD_ID=local
VITE_APP_VERSION=0.2.0
VITE_AD_PLATFORM=mobile
VITE_ADS_ENABLED=true
VITE_ENABLE_WEB_AD_PLACEHOLDERS=true
VITE_ENABLE_AD_DEBUG=true
VITE_PRIVACY_POLICY_URL=/privacy-policy.html
VITE_ADMOB_APP_ID_ANDROID=
VITE_ADMOB_APP_ID_IOS=
VITE_ADMOB_BANNER_HOME=
VITE_ADMOB_BANNER_RESULT=
VITE_ADMOB_INTERSTITIAL_CALC_DONE=
```

## Publicité

Le front web n’embarque plus AdSense.

Les composants `AdSlot` servent maintenant à :
- réserver les emplacements d’affichage dans l’UI ;
- conserver les points d’insertion pub dans le produit ;
- préparer le branchement futur vers AdMob dans la couche native.

## Intégration AdMob à faire côté mobile

À prévoir dans le projet Android/iOS natif :
- ajout du SDK Google Mobile Ads ;
- déclaration de l’App ID AdMob ;
- intégration du consentement natif (UMP) ;
- mapping des bannières/interstitiels avec les slots front.

## Scripts npm

- `npm run dev` : développement local
- `npm run typecheck` : contrôle TypeScript
- `npm run lint:types` : vérification TypeScript
- `npm run build` : build production
- `npm run preview` : aperçu local du build
- `npm run ci` : typecheck + build + audit
