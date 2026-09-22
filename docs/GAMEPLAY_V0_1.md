# Règles gameplay — v0.1

## Terrain

- Vue 2D du dessus.
- 4 branches : haut, bas, gauche, droite.
- 3 voies entrantes par branche pour ce premier prototype.
- Haut et bas : STOP.
- Gauche et droite : CÉDEZ-LE-PASSAGE.

## États d'une voiture

1. ARRÊT
2. RALENTI
3. NORMAL
4. RAPIDE

Une voiture qui repart après un arrêt revient toujours en NORMAL.

## Contrôles tactiles

### Appui simple
- Avant la ligne : demande d'arrêt à la prochaine ligne STOP/CÉDEZ.
- Si un ordre d'arrêt est déjà actif : annule cet ordre.
- À l'arrêt : fait repartir la voiture en vitesse NORMAL.
- Après la ligne : trop tard pour demander un arrêt.

### Swipe longitudinal
- Dans le sens de circulation : RAPIDE.
- Dans le sens inverse : RALENTI.

### Swipe transversal
- Déplace la voiture d'une voie vers la voie voisine.
- Le déplacement est progressif, pas instantané.
- Un changement de voie dangereux peut provoquer une collision.
- Le changement de voie n'est autorisé qu'avant l'intersection.

## Défaite

Toute collision termine la partie :
- collision au centre du carrefour ;
- collision par l'arrière dans une file ;
- collision pendant un changement de voie.

## Difficulté

- Niveau 1 au départ.
- +1 niveau toutes les 45 secondes.
- L'intervalle entre apparitions diminue progressivement.
- La vitesse générale augmente légèrement.
- La montée en difficulté reste lente pour laisser au joueur le temps d'apprendre.

## But de cette version

Valider :
- la lisibilité du carrefour ;
- le plaisir du contrôle tactile ;
- le risque créé par les files ;
- le changement de voie ;
- le rythme de difficulté.

Les virages et règles routières plus complexes ne font pas encore partie de la v0.1.
