<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# BatiQuant

Base front-end Vite/React de l’application mobile BatiQuant.

Cette version embarque désormais les briques prévues pour la publication Android :
- consentement utilisateur et point d’entrée confidentialité ;
- intégration native Android pour Google Mobile Ads / UMP / Google Play Billing ;
- mode Pro permettant de supprimer les publicités et de débloquer le suivi chantier illimité ;
- pages d’aide et de politique de confidentialité cohérentes avec le site public.

## Prérequis

- Node.js 20+
- npm

## Installation locale

1. Installer les dépendances : `npm install`
2. Lancer le serveur de développement : `npm run dev`
3. Vérifier le typage : `npm run typecheck`
4. Générer le build : `npm run build`

## Variables d’environnement utiles

Créer un fichier `.env.local` si nécessaire.

Exemple :

```env
VITE_BUILD_ID=local
VITE_APP_VERSION=0.1.0
VITE_AD_PLATFORM=mobile
VITE_ENABLE_WEB_AD_PLACEHOLDERS=true
VITE_ENABLE_AD_DEBUG=true
VITE_PRIVACY_POLICY_URL=https://www.batiquant.fr/privacy-policy.html
VITE_ADMOB_APP_ID_ANDROID=
VITE_ADMOB_APP_ID_IOS=
VITE_ADMOB_BANNER_HOME=
VITE_ADMOB_BANNER_RESULT=
VITE_ADMOB_INTERSTITIAL_CALC_DONE=
```

## Publicité, consentement et Pro

Le front React conserve les points d’insertion publicitaires, tandis que l’affichage réel et le consentement sont pilotés par la couche native Android lorsqu’elle est disponible.

La version gratuite peut afficher des publicités. La version Pro supprime les publicités et étend certaines limites produit selon la configuration publiée.

## Politique de confidentialité

URL publique à utiliser dans Google Play Console :

```text
https://www.batiquant.fr/privacy-policy.html
```

L’application embarque aussi une version intégrée de la politique de confidentialité dans l’écran Réglages.

## Configuration Android AdMob / Billing

La couche Android lit en priorité ces propriétés Gradle (ou variables d’environnement du même nom) :

```properties
BATIQUANT_ADMOB_APP_ID=
BATIQUANT_ADMOB_BANNER_HOME=
BATIQUANT_ADMOB_BANNER_RESULT=
BATIQUANT_ADMOB_INTERSTITIAL_CALC_DONE=
BATIQUANT_PLAY_BILLING_REMOVE_ADS_PRODUCT_ID=remove_ads
```

Sans configuration explicite, le projet utilise les identifiants de test Google pour éviter d’envoyer du trafic invalide pendant le développement.

## Scripts npm

- `npm run dev` : développement local
- `npm run typecheck` : contrôle TypeScript
- `npm run build` : build production
- `npm run preview` : aperçu local du build
- `npm run ci` : typecheck + build + audit
