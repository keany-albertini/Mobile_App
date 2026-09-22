# Mobile_App — prototype Carrefour v0.1

Prototype mobile 2D Android/iOS construit avec Expo + React Native.

## Ce qui est jouable en v0.1

- Carrefour vu du dessus.
- 3 voies entrantes depuis le haut, le bas, la gauche et la droite.
- STOP sur les axes haut/bas et CÉDEZ sur les axes gauche/droite.
- Les voitures roulent automatiquement.
- Appui sur une voiture avant le carrefour : ordre de s'arrêter à la ligne.
- Appui sur une voiture arrêtée : reprise à vitesse normale.
- Swipe dans le sens de déplacement : vitesse rapide.
- Swipe dans le sens inverse : vitesse lente.
- Swipe latéral : changement d'une voie.
- Collisions dans le carrefour, par l'arrière ou pendant un changement de voie = partie perdue.
- Difficulté progressive et volontairement lente : un niveau toutes les 45 secondes.
- Le trafic s'intensifie progressivement et la vitesse de base augmente légèrement.
- Score basé sur le temps de survie et le nombre de voitures sorties de l'écran.

## Limites volontaires de la v0.1

Les voitures vont uniquement tout droit. Les virages, priorités avancées, feux, types de véhicules, sons, vibrations et progression long terme viendront après validation du feeling de jeu.

## Tester sur téléphone

Pré-requis : Node.js compatible avec Expo SDK 57.

```bash
npm install
npm start
```

Scanne ensuite le QR code avec Expo Go sur Android/iOS.

Pour lancer directement une cible :

```bash
npm run android
npm run ios
npm run web
```

## Version

Prototype gameplay : **0.1.0**
