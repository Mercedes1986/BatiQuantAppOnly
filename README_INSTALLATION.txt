Correctif BatiQuant Pro / Suppression totale des publicités

Remplace les fichiers du projet par ceux fournis dans ce ZIP, puis lance :

npm run build
npx cap sync android

Ensuite dans Android Studio :
Build > Clean Project
Build > Rebuild Project

Objectif du correctif :
- Si l'achat Google Play "batiquant_premium" est actif, les bannières sont masquées.
- Si l'achat Google Play "batiquant_premium" est actif, les interstitiels ne sont plus préchargés.
- Si un interstitiel était déjà chargé au moment de l'achat, il est vidé.
- Si une bannière était déjà affichée ou en cours de chargement au moment de l'achat, elle est supprimée.

Fichier réellement modifié pour ce correctif :
android/app/src/main/java/com/batiquant/app/BatiQuantNativeAdsBridge.java

Les autres fichiers sont fournis pour garder un paquet cohérent avec la version actuelle de l'app.
