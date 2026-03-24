Correction ciblée pour l'erreur :
- src/main.tsx : import de consentService conservé et validé
- src/services/consentService.ts : fichier complet à remettre
- src/services/persistentStorage.ts : dépendance directe de consentService, à remettre aussi

Si l'erreur TS2307 reste après remplacement, le problème n'est plus le code mais l'état du projet local :
1. vérifier que le fichier existe bien physiquement dans src/services/
2. redémarrer TypeScript Server dans VS Code
3. relancer npm install si node_modules a été touché
