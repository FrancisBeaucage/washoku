# /data — le contenu du site

Ce dossier **fait foi**. Les pages HTML en sont le rendu : elles contiennent une
copie des données, réécrite par `tools/generer.js`. Modifier le HTML à la main
dans un bloc `const R = [...]`, `const I = [...]` ou `const E = [...]` ne sert à
rien — la prochaine génération l'écrasera.

## Le cycle

```bash
npm run verifier   # les 9 règles + contrôle que HTML et JSON disent la même chose
npm run generer    # /data → pages HTML + manifeste, puis validation
```

`generer` refuse d'écrire si le contenu régénéré ne correspond pas, champ par
champ, à ce que la page contenait. C'est le garde-fou contre une perte
silencieuse pendant une édition.

## Les fichiers

| Fichier | Contenu | Bloc de la page |
|---|---|---|
| `manifeste.json` | Ce qui existe, et les compteurs. **Généré** — ne pas éditer. | — |
| `guide-2-fiches.json` | Techniques `T*` et recettes `R*` | `R` de `guide-2-recettes.html` |
| `guide-3-ingredients.json` | Fiches d'ingrédients | `I` de `guide-3-supermarche.html` |
| `guide-4-exercices.json` | Exercices | `E` de `guide-4-bouger.html` |

## Ce qu'il faut savoir avant d'éditer

**Les identifiants sont permanents.** `R10` restera `R10` pour toujours, même si
la recette change du tout au tout. Le journal du guide 6 renvoie aux fiches par
identifiant : renuméroter invaliderait rétroactivement le carnet.

**Une fiche ne se supprime pas.** On lui met `"statut": "retiré"` et un
`"motif_retrait"`. Elle disparaît du site, elle reste dans le fichier, et son
identifiant n'est jamais réattribué.

**Le texte est du texte, pas du HTML.** Les champs `etapes[].texte`,
`notes[].texte` et `sous_titre` du guide 2 sont rendus tels quels par la page :
une balise `<strong>` s'y afficherait en toutes lettres. Pour insister, écrire
en majuscules, comme le reste du dossier le fait déjà. Les champs du guide 3
(`description`, `ou_le_trouver`, `a_quoi_ca_ressemble`, `note.texte`) acceptent
au contraire du HTML simple — c'est une particularité de cette page.

**Le `†` est devenu un booléen.** Un ingrédient à lire avec la partie santé du
guide 1 porte `"sante": true`. Le champ `sante_pos` mémorise où le symbole se
plaçait dans la phrase (« wakame † séché », pas « wakame séché † ») ; le laisser
tel quel en modifiant le texte, ou le mettre à `null` pour le renvoyer à la fin.

**`commentaire_source`** contient les lignes qui précèdent l'entrée dans le
fichier HTML généré : commentaires de section, ligne vide de séparation. C'est
de la mise en forme du code source, pas du contenu.

## Nutrition

`proteines_g` et `calories` sont les valeurs numériques, utilisables pour un
calcul. `proteines_affiche` et `calories_affiche` sont ce que le lecteur voit
(« ≈ 190 / tasse », « ~44 g ») — **les deux doivent rester cohérents.**

`lipides_g` et `sodium_mg` existent dans le schéma mais valent `null` presque
partout : le dossier ne les a jamais chiffrés fiche par fiche. `null` veut dire
« inconnu », jamais « zéro ». Les remplir demande de peser, pas de deviner.

`variable: true` marque les plats de restes, dont l'apport dépend de ce qu'on y
met (R11, l'ochazuke). La règle 5 de la validation les laisse passer sans
chiffre.

## Ce qui n'est pas encore ici

La prose des guides 1, 5 et 6, les annexes du guide 2 (lexique, yakumi,
dépannage, thé) et le lexique japonais vivent encore dans le HTML. Ce sont des
sections écrites à la main, avec des infobulles qui portent les prononciations ;
leur migration est la deuxième étape.
