# /data — le contenu du site

Ce dossier **fait foi**. Les pages HTML ne contiennent plus aucune donnée : ce
sont des gabarits, écrits en entier par `tools/generer.js`, qui lisent `/data`
au chargement. **Modifier un fichier `.html` à la racine ne sert à rien** — la
prochaine génération l'écrasera intégralement. Tout se corrige ici.

Le document 20 a fait ce basculement. Avant, sept pages servaient 971 Ko de
HTML, dont une de 297 Ko qui portait les 79 fiches en ligne et six annexes
empilées dessous ; `/data` en était l'image, et le générateur redescendait vers
les pages en vérifiant l'aller-retour. Maintenant, la flèche ne va que dans un
sens.

## Le nom du site, et son adresse

🔴 **LE SITE S'APPELLE TEISHOKU. SON ADRESSE RESTE `.../washoku/`.** Les deux ne
sont pas la même chose : **un nom est une chaîne d'affichage, une adresse est un
chemin de dépôt.** Renommer l'adresse casserait le raccourci de l'écran d'accueil
pour rien, puisqu'aucun lien externe n'existe. `washoku` est donc le nom de code
du dépôt, et c'est sans conséquence.

**定食 *teishoku* nomme le PLATEAU, pas la nationalité** : riz, soupe, un plat,
des accompagnements. *Washoku* (和食, la cuisine japonaise traditionnelle) était
inexact deux fois — **trop étroit**, la part japonaise étant passée sous la
moitié, et **trop précis**, puisqu'il exclut par définition le 洋食 *yōshoku*,
dont le curry. Un *teishoku-ya* sert le poisson grillé, le mābō dōfu chinois et le
curry sous le même toit sans que personne ne s'en étonne : **le mot reste exact
quoi qu'on ajoute ensuite.**

**Et le caractère 定 dit le mécanisme du dossier.** 定 veut dire « fixé, déterminé,
décidé » : 定食, c'est « le repas décidé », et la phrase centrale du dossier est
« le contenant décide de la portion ». L'ancien mot-marque, 和, portait
l'infobulle « l'harmonie, et le Japon » — joli, et muet sur la méthode.

**Où le nom vit** : dans la constante `NOM` de `tools/lib/pages.js`, avec
`GLYPHE`, `GLYPHE_URL` et `INFOBULLE`. De là partent le `<title>` de chaque page,
les deux mots-marques, le favicon en data-URL et les quatre `document.title`
posés côté client. Le manifeste publie `site: "washoku"` (la clé du dépôt) **et**
`nom: "Teishoku"` (le nom affiché), pour qu'un agent extérieur n'ait pas à
choisir. Document 34, `S41`.

⚠️ **Deux fichiers échappent à cette constante et se corrigent à la main** :
`apple-touch-icon.png`, qui porte le glyphe en image, et **`conditions.html`, qui
n'est PAS générée par `pages.js`** — c'est la seule page du site dans ce cas, et
elle porte quand même l'en-tête et le favicon. Un renommage qui l'oublie laisse
une page qui contredit les dix-huit autres.

## Le cycle

```bash
npm run verifier      # les 25 règles + contrôle que les pages sont bien celles que /data produit
npm run appliquer 12  # marque le document 12 comme appliqué
npm run generer       # /data → pages HTML + manifeste + index + fiches, puis validation
```

`verifier` n'écrit rien : il signale les écarts. `generer` réécrit les pages à
partir de `/data`, et sort en erreur s'il a trouvé un écart — non parce que
c'est une faute, mais pour forcer la relecture du diff. **Un écart est le cas
normal juste après une édition de `/data`.**

`appliquer` s'appelle une fois par document de mise à jour, après avoir posé son
contenu dans `/data` et avant `generer`. Il allonge
`documents-appliques.json` ; c'est de là, et de nulle part ailleurs, que le
manifeste tire son `dernier_document_applique`.

## Les fichiers

| Fichier | Contenu | La page qui le rend |
|---|---|---|
| `manifeste.json` | Ce qui existe, les compteurs, et l'adresse de tout le reste. **Généré** — ne pas éditer. | — |
| `index.json` | Un objet par fiche, réduit à ce qui sert à choisir, filtrer et rendre une carte. **Généré** — ne pas éditer. | `recettes.html`, `techniques.html` |
| `fiches/<ID>.json` | Une fiche par fichier, copie exacte du recueil. **Généré** — ne pas éditer. | `fiche.html?id=<ID>` |
| `guide-2-fiches.json` | Techniques `T*` et recettes `R*` | *(la source de l'index et des fiches seules)* |
| `guide-2-annexes.json` | Lexique, mots de cuisine, montage, yakumi, dépannage, thé, équipement | `annexe.html?id=<ID>` |
| `guide-1-manger.json` | Les 22 sections du guide 1 | `guide-section.html?guide=1&id=<ID>` |
| `guide-3-ingredients.json` | Fiches d'ingrédients | `ingredients.html`, `ingredient.html?id=<ID>` |
| `guide-3-sections.json` | Les 8 sections de prose du guide 3 | `guide-section.html?guide=3&id=<ID>` |
| `guide-4-exercices.json` | Exercices | `exercices.html` |
| `guide-4-sections.json` | Les 8 sections de prose du guide 4 | `guide-section.html?guide=4&id=<ID>` |
| `guide-5-plan.json` | Cibles chiffrées et sections du plan | `plan.html` |
| `guide-6-journal.json` | Entrées du journal | `journal.html` |
| `historique-repas.json` | Ce qui a été mangé, un enregistrement par repas | — |
| `documents-appliques.json` | Les numéros des documents de mise à jour déjà appliqués | — |
| `rayons.json` | Les rayons du guide 3 : la clé de `section` et son libellé | `ingredients.html` |
| `zones-exercices.json` | Les zones du corps du guide 4 : la clé de `zone` et son libellé | `exercices.html` |

### Le budget de l'index

`index.json` est le budget de la page de liste : elle le charge en entier à
chaque ouverture, sur un téléphone, souvent sur données cellulaires. Le
document 20 fixe la cible à **60 Ko pour 180 fiches**, et la règle 24 la
vérifie **sur ce qui part sur le fil** — donc après compression, puisque c'est
ce que le lecteur paie et que GitHub Pages compresse.

À 107 fiches, le fichier pèse 54 Ko bruts et **9,6 Ko compressés**, soit une
projection de 16 Ko à 180 fiches. **En octets bruts, la cible n'est pas
atteignable** : elle supposait un index sans photos, et une carte sans photo
n'est pas la carte que le dossier a. Deux économies réelles ont quand même été
faites, et elles valaient la peine — l'adresse de chaque fiche ne s'y recopie
plus (le manifeste publie le patron), et **une clé absente veut dire « rien ne
le dit »**, donc les valeurs vides ne s'écrivent pas.

**Il ne reste plus une ligne de prose dans le HTML.** C'était le cas jusqu'au
document 20, et ça a coûté cher à découvrir : le document diagnostiquait le
guide 1 comme « le seul guide sans fichier de données derrière lui », alors que
les guides 3 et 4 en portaient huit sections chacun et le guide 2 deux de plus
que son fichier d'annexes. Dix-huit sections que la refonte aurait effacées en
silence. C'est la règle 23 — aucun lien interne mort — qui les a trouvées, par
un renvoi du guide 5 vers une ancre qui n'existait plus.

### Les pages, et à quoi elles servent

| Page | Ce qu'elle est |
|---|---|
| `index.html` | L'accueil : les cibles du jour et quatre portes |
| `recettes.html` | La liste filtrable des recettes. **Rien en dessous** |
| `techniques.html` | La liste des techniques, à part : une technique ne se choisit pas pour souper |
| `fiche.html?id=` | Une fiche, en mode cuisine — le reste derrière un seul bouton |
| `ingredients.html` · `ingredient.html?id=` | Le guide 3 |
| `exercices.html` | Le guide 4 |
| `guide.html` | La table des matières de tout ce qui s'explique |
| `guide-section.html?guide=&id=` | Une section de prose, une page |
| `annexe.html?id=` | Une annexe du recueil, une page |
| `plan.html` | Le guide 5 — reste un document d'une seule page |
| `journal.html` | Le guide 6 |

Les six anciennes adresses — `guide-1-manger.html` … `guide-6-journal.html` —
sont des **redirections**, et elles traduisent l'ancre : `guide-2-recettes.html#R14`
aboutit à `fiche.html?id=R14`. Ces liens sont dans du CONTENU, pas dans un
gabarit ; les casser aurait été silencieux. La règle 23 les vérifie tous.

## Le protocole de lecture, depuis l'extérieur

Une seule adresse à mémoriser ; tout le reste s'ouvre en cascade. C'est ce qui
règle le mode d'échec du 8 au 11 août 2026 — dix plats et deux techniques
improvisés faute de pouvoir lire la source de vérité.

1. `https://francisbeaucage.github.io/washoku/data/manifeste.json` — les
   compteurs, le dernier document appliqué, et l'**adresse complète** de chaque
   autre fichier. Un agent extérieur ne peut récupérer qu'une adresse qu'on lui
   a donnée : c'est pourquoi le manifeste porte des `url`, pas des noms.
2. `index.json` — quelles fiches existent, avec de quoi choisir : nom,
   catégorie, protéines, calories, temps total, et l'adresse de la fiche.
   Environ 25 Ko, contre 230 pour le recueil.
3. `fiches/<ID>.json` — les deux ou trois fiches d'un repas, et rien d'autre.

**Ne jamais charger `guide-2-fiches.json`** — le recueil complet — sauf pour un
audit. C'est neuf fois le poids de l'index pour la même information.

GitHub Pages sert `/data` avec `cache-control: max-age=600`, et certains outils
de récupération ajoutent leur propre cache, plus long. **Toujours interroger avec
un paramètre anti-cache :**

```bash
curl -s "https://francisbeaucage.github.io/washoku/data/manifeste.json?cb=$(date +%s)"
```

Après un envoi, compter jusqu'à dix minutes avant qu'un client qui avait déjà lu
le fichier ne voie la nouvelle version, en plus du délai de déploiement.

Un fichier qui paraît périmé vient presque toujours de là. Le 11 août 2026, un
bogue de génération a été signalé sur cette base : le manifeste était correct en
local, dans `HEAD` et en ligne, et c'est le cache de l'outil de récupération qui
servait une copie du document 7. Vérifier avec le paramètre anti-cache avant de
conclure à un défaut du générateur.

Le domaine n'est écrit qu'à un seul endroit : la constante `BASE_URL` de
`tools/lib/sources.js`. Un déménagement se corrige là et nulle part ailleurs.

**Le manifeste est régénéré à chaque `npm run generer`**, y compris quand la
génération signale un écart. La règle 16 vérifie qu'il reste auto-suffisant :
tout fichier de `/data` y figure, chaque entrée porte une adresse absolue sous
`BASE_URL`, et `index.json` comme `fiches/` y sont annoncés. Un manifeste qui
n'ouvre pas la cascade n'est pas un défaut cosmétique — c'est une porte fermée
pour l'agent qui s'en sert comme point d'entrée.

`index.json` et `fiches/` sont la **même donnée** que le recueil, écrite deux
fois de plus par le même script. La règle 15 vérifie qu'elles n'ont pas divergé ;
une divergence signale un générateur cassé, pas une faute de saisie.

## Le numéro du dernier document appliqué

**Tout compteur du manifeste se calcule à partir de l'état réel du dépôt, jamais
d'une valeur recopiée.** `dernier_document_applique` était le dernier à y
échapper : il était saisi à la main dans `generer.js`, donc oubliable — et il a
été oublié, ce qui a coûté une session entière le 11 août 2026, l'agent de
planification croyant à tort que le travail n'était pas en ligne.

La source unique est maintenant `documents-appliques.json`, et
`dernier_document_applique` en est le maximum. `generer.js` ne fait que le lire
et n'accepte aucune valeur en paramètre. La lecture a lieu **avant toute
écriture** : liste absente, illisible ou vide arrête la génération au lieu de
produire un manifeste qui ment. `appliquer` refuse un numéro inférieur ou égal
au maximum déjà présent — un numéro qui recule ou stagne est un bogue, jamais
une intention. La règle 16 vérifie que le manifeste et la liste s'accordent.

## L'historique

Ce fichier ne se rend nulle part : il vit dans `/data` et sert à la
planification. Il figure quand même au manifeste, sinon un agent extérieur ne
peut pas l'atteindre.

`historique-repas.json` — un enregistrement par repas. Il existe parce que le
11 août 2026 un sunomono a été proposé comme un plat neuf alors qu'il avait été
cuisiné quelques jours plus tôt, et que personne n'avait de moyen de le savoir.

- **`fiches`** — les identifiants cuisinés. **`hors_fiche`** recueille ce qui a
  été mangé sans fiche correspondante : yogourt, onigiri du commerce, restaurant.
  Sa présence répétée signale qu'une fiche manque au recueil.
- **`repas`** — `dejeuner`, `diner`, `souper` ou `collation`. La valeur
  `journee`, qui servait quand la source ne distinguait pas mieux, a disparu au
  document 14 : la seule entrée qui l'utilisait a été scindée en deux, et un
  agrégat qui mêle un déjeuner et un dîner n'apprend rien.
- **`verdict`** — `excellent`, `bon`, `correct`, `rate`, `rejete`, ou `null`
  quand rien ne le dit. Ne pas inventer un jugement pour remplir le champ. Les
  quatre premiers vont du meilleur au pire ; **`rate` doit rester utilisable** —
  un historique où l'échec ne peut pas s'écrire est un palmarès, pas un
  historique, et c'est précisément l'échec qui corrige les fiches.
- **`journal`** — l'entrée du guide 6 d'où vient l'enregistrement, quand il y en
  a une. La règle 17 vérifie qu'elle existe.

La règle 17 contrôle le format des dates et la cohérence des renvois ; la règle
19 contrôle `repas` et `verdict` ; la règle 2 vérifie que les fiches citées
existent.

### L'inventaire n'est pas publié

**Le stock de denrées ne vit pas sur le site.** `inventaire.json` a été retiré au
document 14, le 12 août 2026, parce qu'un inventaire publié est périmé avant
d'être visible et induit des propositions de repas fondées sur des aliments
absents — un stock vieux de trois jours a fait bâtir deux propositions sur du
lait de soya et une poudre de protéines jamais achetés. Un inventaire de denrées
change plusieurs fois par jour ; le circuit document → application →
déploiement → cache ne suit pas.

Le registre transactionnel — les mouvements, le stock — vit **hors du dépôt**, au
rythme quotidien. Le site conserve `historique-repas.json`, qui est un
enregistrement de ce qui a été mangé et **ne périme pas**.

Ne pas recréer le fichier en croyant réparer un oubli : son absence est la
décision, pas le défaut.

## Le contrat de mise en forme

C'est le piège principal du dossier, parce qu'il n'est **pas uniforme**.

**Les champs texte des fiches du guide 2 sont du texte brut.** `sous_titre`,
`ingredients[].texte`, `etapes[].texte`, `notes[].texte`, `ajustement`,
`pour_la_maison`, `preparation_avance`, `prononciation`, `nutrition.note`,
`motif_statut[lecteur]` : la page les rend tels quels. Une balise `<strong>` s'y
afficherait en toutes lettres. Pour insister, écrire en MAJUSCULES, comme le
reste du dossier le fait déjà.

🔴 **DEUX RÈGLES QUI N'ÉTAIENT NULLE PART, ET QUI EXPLIQUENT QUARANTE-CINQ
OCCURRENCES.** Elles entrent au document 33 (M1), et c'est le rédacteur des
documents qui les demande contre lui-même.

1. **Un renvoi s'écrit en TEXTE NU** — « voir R110 », jamais `` `R110` `` entre
   accents graves.
2. **Un tableau comparatif ne va JAMAIS dans une note.** Quand la comparaison
   vaut la peine, elle s'écrit en phrases dans la note ; le tableau reste dans
   le document de mise à jour, pour le rédacteur et pour l'agent, pas pour le
   site.

⚠️ **CE QUI RENDAIT LA FAUTE INVISIBLE : les documents de mise à jour SONT du
markdown.** Une note écrite dans un fichier où le gras et les tableaux sont
légitimes hérite de la mise en forme de son enveloppe, et personne ne relit une
note en se demandant ce qu'elle devient sortie de son document. Quarante-cinq
tableaux markdown sont entrés dans les notes de cette façon et ont été nettoyés
à la main à chaque document depuis le 26. **La règle 11 les refuse maintenant —
`**`, un accent grave ou une barre verticale — sur les dix champs ci-dessus et
non plus sur quatre.**

**Les champs du guide 3 acceptent du HTML simple** — `description`,
`ou_le_trouver`, `a_quoi_ca_ressemble`, `note.texte`.

### Les paragraphes

**Un champ texte peut porter plusieurs paragraphes, séparés par DEUX sauts de
ligne — `\n\n` — et rien d'autre.** Ça vaut pour `etapes[].texte` et
`notes[].texte` du guide 2, et pour `note.texte` du guide 3. La page découpe sur
ce séparateur et rend un `<p>` par morceau ; **un saut de ligne simple ne se rend
pas** (le HTML le replie en espace), et la règle 11 le refuse pour cette raison,
comme elle refuse un blanc en tête ou en queue.

Le document 19 a ouvert cette porte parce que la limitation avait mordu deux
fois : trois notes qui portaient chacune quatre ou cinq idées distinctes ont dû
être fusionnées en un seul pavé. Ce n'est pas cosmétique — la note de réchauffage
du riz (T1) explique la disposition, la pellicule, le temps, la double passe et
le repos, et **c'est une note qu'on lit debout devant le micro-ondes.**

Des deux voies possibles — un tableau de chaînes, ou un séparateur documenté —
c'est le séparateur qui a été retenu : le tableau aurait changé le TYPE du champ,
donc le mapper, le contrat d'aller-retour d'`extraire.js`, la règle 11 et le
littéral de la page, pour 79 fiches, sans rien gagner au rendu.

Le guide 3 porte aussi trois champs de repérage en magasin :
`noms_alternatifs` (les autres noms sous lesquels le produit se vend — le
shichimi togarashi s'étiquette « Nanami Togarashi », et la recherche de la page
balaie ce champ), `description_visuelle` (à quoi ressemble l'emballage en rayon)
et `zone_magasin`, **qui est un ensemble fermé depuis le document 23** : cinq
zones du supermarché du parcours — `entree-droite`, `mur-du-fond`,
`allees-centrales`, `congelateurs`, `fin-de-magasin` — plus les enseignes où
l'on va autrement : `kim-phat`, `iga`, `super-c`, `costco`, `mayrand`, `saq`,
`miyamoto`, `metro`, `autre`, ou `null`. Le champ répond à « où est-ce », et la
réponse est une zone pour un produit du parcours, une enseigne pour un produit
d'ailleurs. Il était documenté ici et vérifié par personne — le frère jumeau du
`section: "legumes"` du document 13 — et c'est pour ça que le « Costco » de
`premier-protein` avait atterri dans `ou_le_trouver` : il n'y avait pas de
valeur légitime à mettre. Les deux derniers ne se rendent pas dans la
page : voir « Les champs hors page » ci-dessous.

**Le journal, les annexes et le plan sont composés de blocs**, et leurs champs
texte acceptent les balises **en ligne** : `<a>`, `<strong>`, `<em>`, `<span>`,
`<br>`, `<sup>`. Rien d'autre. Un tableau ou une liste ne s'écrit pas à la main
dans un champ texte : c'est un bloc `tableau` ou `liste`.

**Le markdown ne se rend nulle part.** Des astérisques `**` s'afficheront en
toutes lettres, partout, sans exception.

La règle de validation 11 vérifie les trois points.

## Les blocs

Le journal, les annexes et le plan ont un `corps` qui est une **liste de blocs**,
pas un bloc de texte. Chaque bloc porte un `type` :

| `type` | Ce que c'est |
|---|---|
| `texte` | un paragraphe ou un titre — `balise`, `classe`, `texte` |
| `liste` | `ordonnee` et `elements[].texte` |
| `tableau` | `lignes[].cellules[]`, chaque cellule ayant `balise` (`th`/`td`) et `html` |
| `note` | l'encadré à filet : `titre` et `paragraphes[]` |
| `grille` | des colonnes côte à côte : `colonnes[].blocs` |
| `figure` | une photo, par son rang dans `photos` de l'entrée |
| `commentaire` | un commentaire du code source |
| `html` | **l'échappatoire** : du balisage conservé mot pour mot |

Les champs `attrs`, `attrs_table` et `source` sont de la **mise en page**, pas du
contenu. Ils existent pour que l'aller-retour soit exact ; on n'y touche pas.

Chaque script d'extraction refuse d'écrire si `rendre(analyser(page)) !== page`,
section par section. C'est ce qui a garanti qu'aucune migration n'a perdu de
contenu en chemin, et c'est ce qui a permis de sortir 154 Ko de prose du
guide 1 sans en réécrire une phrase. Les extracteurs sont des scripts
d'**amorçage**, lancés une fois : `tools/extraire-guide-1.js`,
`tools/extraire-prose.js`, `tools/detacher-bannieres.js`. Ils refusent de
tourner une seconde fois.

La règle 22 poursuit le même contrat de l'autre côté : le rendu des blocs
existe en DEUX exemplaires — `lib/prose.js` pour l'outillage, `lib/vue.js` pour
les pages — et deux copies d'un rendu divergent toujours. La règle évalue la
seconde dans Node et compare, bloc par bloc, sur tout `/data`.

Les champs de présentation vides ne s'écrivent pas : un paragraphe sans style
n'a ni `attrs` ni `classe`. C'est ce qui rend le journal écrivable à la main.

## Les champs hors page

Certains champs vivent dans `/data` et nulle part ailleurs : la page ne les rend
pas, donc on ne peut pas les en relire. Une réextraction les écraserait.

| Fichier | Champs |
|---|---|
| `guide-2-fiches.json` | `nutrition.source`, `nutrition.variable`, `nutrition.note`, `voir_aussi`, les cinq champs descriptifs sauf `slug`, `langue_origine`, `registre`, `bol_de_riz`, les cinq champs évaluatifs, `ajustement`, `photo_credit` |
| `guide-3-ingredients.json` | `description_visuelle`, `zone_magasin`, `nutrition`, `langue_origine` |

**Un chemin déclaré couvre aussi ses descendants** : `etoiles` couvre
`etoiles.francis`, dont le nom dépend du lecteur et ne peut donc pas se déclarer
d'avance, et `nutrition` du guide 3 couvre ses onze sous-champs d'un coup.

**`slug` n'y est pas, volontairement.** Il se calcule depuis `fr` par la même
`limace()` que les identifiants du guide 3, donc la règle 20 vérifie à chaque
validation qu'il vaut toujours `limace(fr)` au lieu de le laisser dériver en
silence. Le jour où un slug curaté serait nécessaire, il faudra le déclarer ici —
et accepter qu'aucune règle ne le surveille plus.

Ils sont déclarés dans `champs_hors_page` de `tools/lib/sources.js`. Le nom
vient de l'époque où les pages portaient les données : un champ que la page ne
rendait pas était un champ qu'une réextraction écrasait. **Les pages ne portent
plus rien, donc ce risque-là a disparu** — mais la déclaration reste utile pour
une autre raison, qui est la vraie : elle sépare « champ que le schéma compact
ne rend pas, et c'est voulu » de « champ que le mapper perd ». C'est ce que
vérifie la règle 20.

**La règle 20 refuse désormais qu'un champ y échappe.** Elle fait l'aller-retour
`versEntree` → `versJson` sur chaque entrée de `/data` et compare : ce que
l'aller-retour ne rend pas identique est exactement ce qu'une réextraction
changerait. Trois champs du guide 2 vivaient dans ce trou sans que rien ne le
dise — `nutrition.variable` (recalculé depuis `/variable/i.test()`, donc remis à
`false` sur R64 et T9), `voir_aussi` (toujours rendu vide) et `nutrition.note`
(réécrite avec la phrase par défaut). Ils ont été déclarés au document 16.

Un second tableau, `champs_reconstitues`, recense ce qui ne passe pas par le
mapper du tout : `commentaire_source` et l'`id` du guide 3, calculé depuis `fr`.
La règle 20 doit le savoir pour ne pas crier au loup.

## Les champs à valeurs fermées

Vingt-sept champs n'acceptent qu'une valeur d'une liste connue. **La règle 19 les
vérifie tous**, à partir d'une seule table `champ → ensemble permis` dans
`tools/lib/ensembles.js` — pas vingt-sept règles particulières, qui laisseraient
repasser la vingt-huitième.

**Le manifeste publie ces ensembles**, sous `ensembles_fermes`. C'est la réponse
à une cause commune : trois fautes du document 14 — `retire` écrit sans accent,
`rate` réputé absent alors qu'il était déjà là, un total d'historique faux —
venaient de ce que le rédacteur d'un document ne voit pas `lib/champs.js` et
cite les valeurs de mémoire. Elles se lisent maintenant avant d'écrire :

```bash
curl -s "https://francisbeaucage.github.io/washoku/data/manifeste.json?cb=$(date +%s)" | jq .ensembles_fermes
```

**Un second bloc, `formes_fermees`, dit COMMENT chaque champ porte son ensemble** :
`valeur` (une seule), `liste` (un tableau de valeurs de l'ensemble, la dominante
en premier) ou `par-lecteur` (un objet dont les clés sont des lecteurs). Sans lui,
un rédacteur qui lit `"methode": ["cru", "blanchi", …]` n'a aucun moyen de savoir
que le champ prend un tableau et non une seule valeur — c'est exactement la classe
de faute que le bloc publié existe pour empêcher.

La règle 19 vérifie en queue que les deux blocs publiés disent bien la même chose
que la table — deux copies d'un ensemble finiraient par diverger.

| Fichier | Champ | Forme | Ensemble |
|---|---|---|---|
| guide 2 | `statut` | valeur | `actif`, `retiré` |
| guide 2 | `categorie` | valeur | les libellés de `CATEGORIES` (`lib/champs.js`) |
| guide 2 | `cuisine` | valeur | les libellés de `CUISINES` |
| guide 2 | `registre` | valeur | `emprunt`, ou `null` |
| guide 2 | `bol_de_riz` | valeur | `demi`, `non`, ou `null` |
| guide 2 | `nutrition.source` | valeur | `estime`, `etiquette`, `pese` |
| guide 2 | `type_de_plat` | valeur | `TYPES_DE_PLAT`, ou `null` |
| guide 2 | `methode` | liste | `METHODES` |
| guide 2 | `axe_gout` | liste | `AXES_GOUT` |
| guide 2 | `axe_texture` | liste | `AXES_TEXTURE` |
| guide 2 | `moment` | liste | `MOMENTS` |
| guide 2 | `langue_origine` | valeur | `LANGUES`, ou `null` |
| guide 2 | `video.langue` | valeur | `LANGUES_VIDEO`, ou `null` |
| guide 2 | `etoiles` | par-lecteur | 1 à 5, ou `null` |
| guide 2 | `cout_travail` | valeur | `leger`, `moyen`, `lourd`, ou `null` |
| guide 2 | `statut_perso` | par-lecteur | `STATUTS_PERSO` |
| guide 3 | `statut` | valeur | `actif`, `retiré` |
| guide 3 | `section` | valeur | les clés de `rayons.json` |
| guide 3 | `zone_magasin` | valeur | `ZONES_MAGASIN`, ou `null` |
| guide 3 | `langue_origine` | valeur | `LANGUES`, ou `null` |
| guide 3 | `nutrition.base` | valeur | `BASES_NUTRITION`, ou `null` |
| guide 3 | `nutrition.source` | valeur | `estime`, `etiquette`, `pese`, ou `null` |
| guide 4 | `statut` | valeur | `actif`, `retiré` |
| guide 4 | `zone` | valeur | les clés de `zones-exercices.json` |
| index | `vitesse` | valeur | les libellés de `VITESSES` |
| historique | `repas` | valeur | `dejeuner`, `diner`, `souper`, `collation` |
| historique | `verdict` | valeur | `excellent`, `bon`, `correct`, `rate`, `rejete`, ou `null` |

🔴 **`vitesse` EST LA SEULE LIGNE DE CETTE TABLE QUI PORTE UN FICHIER GÉNÉRÉ, et
c'est voulu.** Depuis le document 34 (`S38`) elle ne s'écrit plus à la main : elle
se dérive du temps total et `generer.js` l'écrit dans `index.json`, le seul
fichier qui la consomme. Elle reste dans la table parce qu'un rédacteur de
document a autant besoin de connaître ses valeurs exactes pour un champ dérivé
que pour un autre — il doit savoir que `moyen` existe et que `median` n'existe
pas. Et le contrôle n'est pas une tautologie : ce qu'il attrape, c'est une table
de seuils qui produirait une classe inexistante.

**Les ensembles se lisent là où ils sont déjà définis, jamais recopiés.** Les
libellés viennent de `lib/champs.js`, les rayons de `rayons.json`, les zones du
corps de `zones-exercices.json`. Recopier créerait une seconde source de vérité,
et déplacerait le problème au lieu de le régler.

Les deux dernières tables vivaient dans les pages jusqu'au document 20 : la page
du guide 3 portait `SECS`, celle du guide 4 portait `ZONES`. Elles sont passées
dans `/data` quand les pages sont devenues des vues générées — et `zone` a gagné
au passage un contrôle qu'il n'avait jamais eu : une valeur inconnue laissait
l'exercice hors de tout regroupement, avec une étiquette vide, sans que rien
n'échoue.

`retiré` **porte son accent** : c'est la valeur que `generer.js` compare pour
écarter une entrée de la page. Un `retire` sans accent y passerait pour une
fiche active — il n'est donc pas permis.

Cette règle existe parce que le document 13 donnait `section: "legumes"` là où la
clé réelle est `leg`. Une clé inconnue ne fait rien planter : elle laisse la
fiche hors de tout filtre de rayon, avec une étiquette vide, et aucun test
n'échouait.

## 🔴 Un champ qui donne la même réponse partout ne s'affiche pas

**Il s'affiche quand il S'ÉCARTE du défaut.** C'est la règle du document 34, et
elle vaut pour tout champ à valeurs fermées qui finit sur une page :

> **UN CHAMP AFFICHÉ SUR CHAQUE FICHE QUI PORTE LA MÊME VALEUR SUR CHAQUE FICHE
> N'EST PAS DE L'INFORMATION, C'EST DU MOBILIER.**

Le principe existait déjà, écrit dans `generer.js` pour `temps_actif` : *« la clé
n'est écrite que lorsqu'elle apprend quelque chose »* — sans attente, elle
vaudrait le total et ne dirait rien. Le document 34 l'applique aux trois champs
qui l'avaient oublié, et **conçoit ses deux champs neufs avec lui dès le départ :
leur valeur par défaut est l'absence.**

| Champ | Défaut, qui ne s'affiche pas | Ce qui s'affiche |
|---|---|---|
| `nutrition.source` | `estime` — la valeur de tout le recueil | `etiquette`, `pese` |
| `video.langue` | `null` et `en` | tout le reste : c'est un avertissement |
| `registre` | `null`, qui veut dire traditionnel | `emprunt` |
| `bol_de_riz` | `null`, un bol de riz normal | `demi`, `non` |
| `temps_actif` (dérivé) | absent quand il vaut le total | le temps de présence |

⚠️ **La différence avec un champ vide est entière, et c'est ce qu'il faut garder
en tête** : `sodium_mg: null` s'affiche « non chiffré », parce qu'un trou dans la
donnée doit se voir (`S33` du document 29). Ici, ce n'est pas un trou : c'est le
cas normal, et l'absence de mention le dit aussi bien que la mention. Un champ
PRÉMATURÉ se cache ; un champ MANQUANT se montre.

## Les nombres affichés dans les pages

**Aucun nombre de fiches, de sections ou d'entrées n'est ÉCRIT dans une page.**
Les pages les calculent à l'affichage, à partir des mêmes fichiers que le reste
du site : un compteur ne peut donc plus périmer, puisqu'il n'existe nulle part
sous forme figée. La règle 9 refuse tout nombre suivi d'un nom de collection
dans un fichier `.html` — « 140 g » ou « 2 L » ne sont pas des compteurs, « 68
fiches » en est un.

C'est le troisième état de cette règle, et les deux premiers ont échoué de la
même façon. Le document 7 recalculait deux phrases. Le document 15 y a ajouté
six pieds de carte, après que celle du recueil eut annoncé 56 fiches pour 74.
Les deux fois, la règle vérifiait une LISTE d'endroits — et la faute suivante
est toujours arrivée à un endroit qui n'y était pas. Le document 20 supprime la
liste : il n'y a plus d'endroit où un compteur puisse être écrit.



## Ce qu'il faut savoir avant d'éditer

**Les identifiants sont permanents.** `R10` restera `R10` pour toujours, même si
la recette change du tout au tout. Le journal renvoie aux fiches par identifiant :
renuméroter invaliderait rétroactivement le carnet.

**Avant de créer quoi que ce soit, chercher.** Par nom français, par romaji et
par japonais. Dix plats et deux techniques ont été improvisés entre le 8 et le
11 août 2026 alors qu'ils existaient déjà, faute de ce seul geste.

**Une fiche ne se supprime pas.** On lui met `"statut": "retiré"` et un
`"motif_retrait"`. Elle disparaît du site, elle reste dans le fichier, et son
identifiant n'est jamais réattribué.

**Le `†` est devenu un booléen.** Un ingrédient de fiche à lire avec la partie
santé du guide 1 porte `"sante": true`. Le champ `sante_pos` mémorise où le
symbole se plaçait dans la phrase (« wakame † séché », pas « wakame séché † ») ;
le laisser tel quel en modifiant le texte, ou le mettre à `null` pour le
renvoyer à la fin.

**`commentaire_source`** contient les lignes qui précèdent l'entrée dans le
fichier généré : commentaires de section, ligne vide de séparation. C'est de la
mise en forme du code source, pas du contenu.

**`jp`, `jp_lecture` et `romaji` acceptent `null`, aux deux guides.** Le dossier
comptait 62 fiches japonaises sur 79 quand la décision a été prise ; les
documents 21 et 22 ont ouvert la porte au laotien et à l'indonésien, et la part
japonaise est tombée sous les deux tiers. **Un nom
japonais obligatoire sur une fiche de nuoc cham ou de yogourt grec n'est pas une
donnée, c'est une traduction inventée pour satisfaire un validateur** — c'est
exactement ce qui est arrivé au yogourt grec, qui a reçu ギリシャヨーグルト parce que
le champ ne pouvait pas être vide. **Le vrai risque est là : un champ obligatoire
qu'on ne peut pas remplir honnêtement se remplit malhonnêtement.**

### `nom_origine` et `lecture_origine`

**`jp`, `jp_lecture` et `romaji` sont des champs JAPONAIS.** Y mettre 白灼 serait
faux, et le manque est devenu criant aux documents 21 et 22 : vingt-quatre de
leurs vingt-huit fiches se nomment en chinois, en lao, en coréen, en thaï, en
vietnamien ou en indonésien. Le document 23 ajoute donc deux champs au guide 2 :

| Champ | Contenu | Exemple |
|---|---|---|
| `nom_origine` | Le nom dans l'écriture de sa langue, ou `null` | `白灼` · `ເຂົ້າຄ້ວ` · `나물` · `rau luộc` |
| `lecture_origine` | La romanisation, ou `null` quand l'écriture est déjà latine | `bái zhuó` · `khao khua` · `namul` |

**Une fiche remplit l'une OU l'autre paire, jamais les deux** — dupliquer
l'information créerait deux sources pour un même fait, et la **règle 25** le
refuse.

**L'état transitoire est réglé depuis le document 28.** Dix-sept des 79 fiches
d'origine portaient du non-japonais dans `jp`, et le tri n'était pas mécanique :
il a demandé une table dans un document, pas une règle. Il y avait **trois cas**,
là où le compte rendu du document 23 n'en voyait que deux.

| Cas | Fiches | Ce qui a été fait |
|---|---|---|
| Écriture native dans `jp` | `T5`, `R25`, `R26`, `R29`, `R30`, `R35`, `R39` | migrées vers la paire d'origine |
| Transcription katakana d'un nom étranger | `R18`, `R23`, `R27`, `R28`, `R64` | **remplacées** par l'écriture native — `ビビンバ` → `비빔밥` |
| Vrai nom japonais d'un plat d'ailleurs | `R5`, `R17`, `R31`, `R36`, `R41` | laissées dans `jp`, où elles sont chez elles |

⚠️ **Le test qui sépare les deux derniers cas, et qui vaut pour toute fiche
future** : *est-ce que quelqu'un, en japonais, appellerait ce plat autrement s'il
avait à le décrire?* Un nom descriptif — 牛肉とブロッコリー, « bœuf et brocoli » —
est une construction japonaise et appartient à `jp`. **Un mot étranger passé par
les katakana n'est pas un nom japonais : c'est un emprunt phonétique, et le nom
d'origine est ailleurs.** Le laisser dans `jp` affirme que le plat porte un nom
japonais; le déplacer tel quel dans `nom_origine` affirme qu'il s'écrit en
katakana. Les deux sont faux — il faut aller chercher l'écriture native.

### `prononciation`

**Un troisième champ de nom, entré au document 29, et la distinction est nette.**
`lecture_origine` répond à *« comment ce mot se lit dans sa langue »* —
`sundubu jjigae`, `shàng jiāng`. C'est de la romanisation savante : exacte, et
**elle ne s'entend pas.** `prononciation` répond à *« comment je le dis à voix
haute en français »* — « souane la tang », « bi-bime-bap ». C'est une aide
orale, **approximative par nature.**

🔴 **C'est la seule information du recueil dont l'usage est de PARLER** :
commander chez Kim Phat, demander un ingrédient, nommer un plat à table.
`gānbiān sìjìdòu` avec ses tons ne sert à rien pour ça; « gan-biène si-ji-dou »
sert. C'est pourquoi c'est un champ et non une note — une note ne se cherche pas.

Il vivait déjà dans le dossier, mais **sous une étiquette qui le contredisait** :
neuf des treize valeurs de `jp_lecture` étaient des approximations françaises et
non des kana. Le refus du renommage global de `jp_lecture` en `lecture_locale`,
au document 28, l'a découvert — **et c'est ce que le renommage aurait figé : un
nom faux sur de la donnée vraie.** Les douze valeurs supprimées par la migration
du `S30` ont été reprises du diff de ce commit, pas réinventées.

⚠️ **Il n'est rempli que là où quelqu'un l'a écrit** — **46 fiches sur 192**
depuis le document 33, contre 13 avant lui. Le reste se remplit au fil des
documents, ou jamais. La page l'affiche dans l'infobulle du nom, à la place de la
prononciation calculée depuis le romaji.

**Les quatre règles qui produisent l'essentiel du bénéfice**, et elles valent
plus que les valeurs déjà écrites parce qu'elles se transportent aux fiches qui
attendent encore :

| Écriture | Ce qu'un francophone dit | En réalité | Exemple |
|---|---|---|---|
| pinyin `zh` · `x` · `q` · `c` | « ze » · « iks » · « kou » · « ss » | **dj · s · tch · ts** | `zhēng` = « djeng » · `xīlánhuā` = « si-lane-houâ » · `càixīn` = « tsaï-sine » |
| indonésien `c` | « ss » ou « k » | **tch** | `bacem` = « ba-tchème », et non « ba-sème » |
| vietnamien `đ` contre `d` | les deux « d » | **`đ` = d · `d` = z** | `đậu` = « dao », mais `dưa` = « zoua » |
| thaï et lao, consonne finale | prononcée | **retenue, à peine posée** | `mak` = « mak » sans le k soufflé · `saap` = « sâpe », très court |

⚠️ **Une valeur déjà écrite peut être remplacée par une meilleure, et l'a été** :
`R136` portait « gan-biène si-ji-dou », où le `j` se lit à la française alors que
le pinyin le veut « dj ». Le document 33 le corrige en « gane-biène sseu-dji-dou ».
**Les deux champs ne se corrigent pas l'un par l'autre** — `lecture_origine` reste
la romanisation savante, `prononciation` reste une approximation.

⚠️ **Ce qui reste vide et vaut la peine : les 23 fiches coréennes des documents
25 et 26**, et les fiches antérieures non japonaises. Un francophone lit
« gyeranmari » comme « jé-rane-ma-ri » alors que c'est « kié-rane-ma-ri », et
« doenjang » comme « do-ène-jang » alors que c'est « twène-djang ».

`langue_origine` (`ja` · `zh` · `ko` · `vi` · `th` · `lo` · `id` · `aucune`) dit à
l'affichage quelle graphie montrer. Au guide 2, son défaut se déduit de `cuisine`,
et il reste réinscriptible — une recette peut porter un nom d'une autre langue que
sa cuisine. Au guide 3, il vaut `null` tant que personne ne l'a établi : `aucune`
serait une affirmation, `null` dit qu'on ne sait pas. **Les fiches existantes ne
perdent aucun nom : c'est une ouverture, pas une migration.**

### `video.langue`

**Ce que `video` porte : `youtube_id`, `auteur`, et depuis le document 24
`langue`.** La **règle 18** exige depuis longtemps qu'une vidéo dise de quelle
chaîne elle vient — une démonstration sans auteur est une source anonyme. Le
document 24 ajoute la langue parlée, et pour une raison précise : deux de ses
vingt-huit vidéos sont dans une langue que le lecteur ne parle pas, `R80` en
indonésien et `T21` en vietnamien. **Une vidéo muette pour son lecteur reste
utile pour les gestes, mais il faut le savoir avant de cliquer**, et la page le
dit maintenant sous le cadre.

⚠️ **`null` ne veut pas dire « français ».** Il veut dire que personne ne l'a
établi. C'est la même convention que `langue_origine` au guide 3, où `null` dit
qu'on ne sait pas et `aucune` serait une affirmation.

🔴 **IL NE SE DÉDUIT JAMAIS DU TITRE, ET LE DOCUMENT 34 (`B57`) L'A ÉTABLI PAR
L'ÉCHEC.** Un titre bilingue est la NORME sur ces chaînes, pas l'exception : la
majorité des titres mêlent une écriture non latine et des mots anglais — « How To
Make Dashi 3 Ways (Recipe) だしの作り方３種類（レシピ） », de Just One Cookbook, qui
est une chaîne anglophone. Un détecteur d'écriture ne peut donc pas remplir ce
champ, et celui qui a été écrit pour essayer a trouvé une alerte sur les quatre
qui existaient : le vietnamien et l'indonésien s'écrivent en lettres latines,
donc son test comptait « Cách Luộc Rau ngon giòn » comme du texte latin
ordinaire. ⚠️ **Un résultat négatif d'un détecteur qu'on vient d'écrire n'est pas
une preuve d'absence** — s'y fier aurait supprimé trois avertissements vrais qui
étaient déjà consignés.

✅ **LA BONNE UNITÉ EST LA CHAÎNE, PAS LA VIDÉO**, et c'est ce qui rend le champ
remplissable : il y a environ trois fois moins de chaînes que de vidéos, une
poignée d'entre elles couvre la vaste majorité du recueil, et une chaîne parle
une langue. Le coût passe de « regarder chaque vidéo » à « classer chaque
chaîne ». Ce qui reste — les petites chaînes qu'on ne peut pas classer sans
regarder — reste à `null`, et un `null` n'affiche rien, donc il ne prétend rien.

**À l'affichage, il ne parle que hors `fr` et hors `en`** : c'est un
avertissement, pas une métadonnée. Voir « Un champ qui donne la même réponse
partout ne s'affiche pas ».

### `registre` — le plat traditionnel et le plat d'emprunt

**Le drapeau du `V1` dit D'OÙ VIENT un plat. `registre` dit QUAND ET COMMENT il
est entré dans sa cuisine.** Les deux font deux métiers différents et le document
34 (`S37`) les sépare explicitement : `R17`, le bœuf et brocoli, garde son drapeau
chinois ET porte `registre: emprunt`, parce que c'est un plat sino-américain que
le japonais nomme en japonais.

**Ensemble fermé à une seule valeur : `emprunt`, ou `null`. `null` veut dire
traditionnel**, et c'est le cas de la vaste majorité.

**LE CRITÈRE, pour que la passe suivante n'ait pas à le réinventer : le registre
vaut `emprunt` quand la culture du plat le nomme ELLE-MÊME comme venu
d'ailleurs** — 中華 *chūka* (le chinois passé au Japon), 洋食 *yōshoku*
(l'occidental passé au Japon), 韓国風 ou フォー風 (« façon coréenne », « façon
phở »). **Ce n'est pas un jugement de pureté, c'est une information d'histoire.**

🔴 **ET LE RECUEIL AVAIT DÉJÀ ENCODÉ L'EMPRUNT, dans le seul endroit qui ne peut
pas filtrer : le nom.** Cinq fiches portent un nom JAPONAIS pour un plat étranger
— 韓国風丼, フォー風, 雲呑 wonton en caractères japonais — et déclaraient pourtant
`langue_origine` d'un autre pays. Le `A19` du document 34 les a corrigées à `ja` :
**`langue_origine` décrit la langue du NOM, pas le pays du plat.** La correction
devait précéder la passe de prononciation, qui applique les règles de lecture de
la langue déclarée et aurait mis du pinyin sur des mots japonais.

⚠️ **Une fiche examinée et ÉCARTÉE, avec sa raison, pour que l'absence se lise
comme une décision** : `R57`, les nouilles instantanées. C'est un produit
industriel de 1958, pas un emprunt — sa lignée passe par le rāmen, qui est chūka,
mais le plat a été inventé sur place. **Le jour où une valeur `moderne`
s'ajoute, `R57` est son premier cas.** Mieux vaut un champ à une valeur qui ne
mente sur aucune fiche qu'un champ à deux valeurs dont la frontière est floue.

**À l'affichage : un MOT, pas une pastille et pas un pictogramme.** Pas une
pastille parce qu'on vient de passer de sept à six au `V1` et que la raison
tient. Pas un pictogramme parce que le drapeau a rendu un CARRÉ sur un navigateur
sans police d'émoji, vu à l'écran : **une marque qui dépend d'une police n'est
pas une marque.** Le mot est au surtitre de la fiche après le drapeau, et sur la
carte de liste en capitales espacées grises, avec « Plat d'emprunt » en `title` et
en `aria-label`.

### `bol_de_riz` — le plat qui remplace le féculent

**La règle vivait dans la PROSE de trois fiches, où aucun filtre ne la voyait** :
`R104` (« pas de riz, ou un demi-bol »), `R113` (« le bol de riz saute »), `R131`
(« il EST le bol de riz »). Et `R114` portait le contre-exemple explicite : ses
racines GARDENT leur bol, « parce que c'est de la fibre et de l'eau, pas de
l'amidon ». Document 34, `S39`.

**Ensemble fermé : `demi`, `non`, ou `null`. `null` veut dire que le plat
s'accompagne d'un bol de riz normal**, et c'est le cas de la vaste majorité.

**CRITÈRE — `non`** quand le plat porte lui-même le féculent (le riz ou les
nouilles sont dedans) ou quand il apporte assez d'amidon pour occuper le quart
féculent ; **`demi`** quand la fiche l'a écrit.

🔴 **LE TEST EST L'AMIDON, PAS LA FORME**, et c'est ce qui tranche les cas
limites : pomme de terre, patate douce, taro et kabocha occupent le quart
féculent ; daikon, lotus, gobo et carotte occupent le quart légume. D'où le
contraste entre `R169`, curry de kabocha à `demi` — cent cinquante grammes de
courge par portion valent une demi-rondelle de riz — et `R114`, mijoté de racines
qui garde son bol entier.

⚠️ **Les fiches écartées comptent autant que celles retenues, et leur raison
s'écrit** : `R37` (les nouilles de konjac remplacent le VOLUME, pas l'amidon —
zéro calorie n'occupe pas un quart féculent) ; `R70`, `R159`, `R160` (le riz
gluant y est l'ACCOMPAGNEMENT attendu, pas un féculent que le plat porte) ;
`R98`, `R109` (quantité de liant ou de garniture, pas de portion) ; `R8` (il ne
porte aucun féculent du tout, donc il prend son bol entier).

**À l'affichage : une case de la grille des mesures, à côté des portions et du
temps** — c'est une consigne d'assiette qu'on lit avant de dresser, pas un chiffre
de nutrition. Elle ne paraît que hors défaut.

### `photo` et `photo_credit`

**`photo` est une ADRESSE, pas un fichier.** Les photos de fiches ne sont pas
dans le dépôt : ce sont des liens `Special:FilePath` de Wikimedia Commons, avec
`?width=1200`. La **règle 3** ne vérifie sur le disque que les chemins locaux —
les photos du guide 3 et du journal, qui vivent dans `assets/`.

```
https://commons.wikimedia.org/wiki/Special:FilePath/<Nom_du_fichier>.jpg?width=1200
```

**`photo_credit`, entré au document 33 (S36), dit de qui elle est.** Il n'existait
pas, donc l'information n'était nulle part, donc elle ne pouvait pas s'afficher
même en le voulant — et **une partie des fichiers de Commons est sous CC BY ou
CC BY-SA, des licences qui demandent de nommer l'auteur, la licence, et de
renvoyer à la source.**

| Clé | Contenu | Exemple |
|---|---|---|
| `auteur` | le nom tel que Commons l'affiche | `Ocdp` |
| `licence` | le code court | `CC BY-SA 4.0` · `CC0` · `Domaine public` |
| `page` | l'adresse de la page du FICHIER, pas de l'image | `https://commons.wikimedia.org/wiki/File:…` |

🔴 **OÙ SE LIT LE NOM DE L'AUTEUR, ET L'ORDRE COMPTE. `Attribution` PRIME SUR
`Artist`.** C'est le champ où le téléverseur DIT comment il veut être crédité, et
il est là exactement pour ça. `Artist`, lui, est du HTML libre et peut contenir
n'importe quoi : sur `File:Tuna can.jpg`, il porte une demande de notification de
trois phrases — « I would appreciate being notified if you use my work… » — et le
nom, *Pavel Ševela*, n'est que dans `Attribution`. Une passe qui lit `Artist`
d'abord écrit la demande dans le crédit et l'affiche sous la photo. L'ordre à
suivre :

1. **`Attribution`**, nettoyé de son HTML ;
2. **`Artist`**, s'il ressemble à un nom — écarter ce qui fait une phrase
   (verbe de licence, « please », « do not », plusieurs points) ;
3. **`Credit`**, sauf quand il vaut « Own work », qui ne nomme personne ;
4. **le téléverseur**, en dernier recours et seulement quand le fichier ne nomme
   personne alors que sa licence exige une attribution. Deux fichiers du recueil
   sont dans ce cas, tous deux CC BY-SA 3.0 avec `AttributionRequired: true` et
   aucun auteur déclaré.

⚠️ **`User:` est un préfixe d'espace de noms, pas une partie du nom** : il se
retire. Deux crédits du document 33 le portaient.

⚠️ **Une photo d'`assets/` ne porte PAS de crédit, et ce n'est pas un manque** :
ce sont les photos du dossier lui-même — `R62` et `R63` — et il n'y a personne à
attribuer. La règle 21 demande les trois clés ou aucune, donc le champ reste
`null` plutôt que de porter une licence supposée. Le `figcaption` ne paraît pas
sur ces deux fiches, et c'est correct.

`null` quand personne ne l'a établi. La **règle 21** refuse un crédit incomplet
— une licence sans son auteur ni sa page n'est pas une attribution, c'est un mot
— et refuse un crédit sur une fiche sans photo. La page rend un `<figcaption>`
discret sous l'image, *auteur · licence*, en lien vers `page`.

⚠️ **Ce n'est pas un avis juridique.** Le dossier écrit ce que Commons dit ; une
certitude sur ce point se demande à un professionnel.

🔴 **LA RÈGLE DE CHOIX VAUT PLUS QUE LE CHAMP : à qualité égale, préférer un
fichier en domaine public ou CC0.** Il n'y a alors rien à attribuer et rien à
maintenir. Sur les fiches qui attendent encore une photo, ce critère coûte
quelques secondes et il enlève un problème entier.

**Comment on cherche une photo, et l'API répond en deux appels :**

```bash
# 1. chercher — par lecture_origine ou romaji d'abord, c'est ainsi que les
#    contributeurs de Commons nomment leurs fichiers
curl -s 'https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srsearch=<termes>&srnamespace=6&srlimit=10'
# 1 bis. souvent meilleur : la catégorie du plat
curl -s 'https://commons.wikimedia.org/w/api.php?action=query&format=json&list=categorymembers&cmtitle=Category:<Plat>&cmtype=file&cmlimit=50'
# 2. qualifier — jusqu'à 50 titres d'un coup, et `extmetadata` porte l'auteur
#    et la licence, donc `photo_credit` se remplit dans le même passage.
#    `iiprop=user` en plus : le téléverseur est le dernier recours quand le
#    fichier ne nomme personne. Lire Attribution AVANT Artist — voir plus haut.
curl -s 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|user|extmetadata&titles=File:A|File:B'
```

**Les critères de retenue, dans l'ordre :** le plat est le sujet, seul, en
assiette ou en casserole — **rejeter les photos de table garnie, un plan large de
six plats n'en montre aucun** ; domaine public ou CC0 si le choix existe ; au
moins 800 px de large, puisque le gabarit demande `?width=1200` ; rejeter une
photo de restaurant occidentalisé quand la fiche décrit une version domestique.

🔴 **RECOUPER L'IMAGE AVEC LE TITRE *ET* LA DESCRIPTION DU FICHIER : NI L'ŒIL
SEUL NI LE NOM SEUL NE SUFFIT.** Cinq erreurs du document 33 avaient cette cause,
et le document 34 en a évité trois de plus par ce seul geste :
`File:Curry rice.jpg` montre exactement ce qu'une fiche de curry japonais
demanderait, et sa description dit « Korean curry rice » ; `File:Curry with
onions (9).jpg` est catégorisé « Curry dishes in Poland ». **Un titre neutre et
une belle image ne disent pas de quel pays vient le plat ; la description, si.**
Un fichier SANS description ne peut pas être recoupé : c'est une raison de le
refuser, pas un détail.

🔴 **ET LE CRITÈRE DE RETENUE PRIME SUR LA DISPONIBILITÉ.** Une photo qui
CONTREDIT la fiche est pire que pas de photo, même quand elle est la seule
disponible : un curry brun-orange lisse et uniforme, monté au bloc de roux,
contredit une fiche dont tout l'argument est qu'on n'en met pas — et des cubes de
pomme de terre bien visibles contredisent une fiche qui consacre un paragraphe à
expliquer pourquoi elle n'en porte pas. **« Aucune photo » est une réponse
admissible, et c'est la bonne dans ces cas-là.**

🔴 **LE REPLI EST LÉGITIME : PAS DE PHOTO.** Le gabarit gère `hasPhoto: false` et
la fiche reste complète. **Une photo approximative est pire qu'un cadre vide,
parce qu'elle enseigne quelque chose de faux sans le dire.** Et certaines
techniques n'ont pas d'image : « le blanchiment préalable des viandes », « la
sauce prémélangée au bol », « le mijotage long » ne se photographient pas. Une
casserole d'eau trouble est une illustration décorative, et le recueil n'en a pas
besoin.

## Les deux blocs des fiches du guide 2

**Le bloc descriptif dit ce que le plat EST. Le bloc évaluatif dit ce qu'un
lecteur EN PENSE. Ils ne se mélangent jamais**, et c'est l'idée centrale du
document 19 — elle vaut plus que la liste des champs.

Le premier est objectif et vrai pour tout le monde : un tom yum est acide et
piquant, un goma-ae de chou blanchi est mou. Le second est une opinion, et **le
site a plus d'un lecteur.** Un schéma qui range la préférence dans la description
impose le goût d'une personne à tous les autres, et rend le site inutilisable
pour la deuxième.

**Descriptif** — `type_de_plat` (la place dans l'assiette, au sens du *ichiju
sansai* ; à ne pas confondre avec `categorie`, qui dit à quel repas le plat
appartient) · `methode` · `axe_gout` · `axe_texture` · `moment` (multiple, pour le
filtre, là où `categorie` est unique et sert au classement) · `slug` (la clé
d'URL, calculée depuis `fr`).

`methode` manquait le plus : la règle de rotation du guide 5 interdit qu'un axe
stagne plus de deux jours, la méthode de cuisson est l'un de ses quatre axes, et
cet axe n'existait nulle part dans les données — il se recalculait de mémoire à
chaque plan hebdomadaire.

⚠️ **`axe_texture` se déclare telle que la texture est DANS L'ASSIETTE**, pas telle
que l'ingrédient est au départ. Le chou nappa cru est croquant ; le même chou
blanchi est mou. C'est le plat qui porte l'axe, pas l'ingrédient — et quand une
fiche accepte plusieurs légumes de textures différentes, la valeur suit le légume
par défaut de la fiche, la variante se disant dans la note.

**Évaluatif** — `etoiles` (1 à 5, ou `null` = jamais essayé) · `cout_travail`
(`leger` = moins de 10 minutes actives) · `statut_perso` · `motif_statut` ·
`pour_la_maison`.

**`etoiles`, `statut_perso` et `motif_statut` sont des objets dont les clés sont
des lecteurs** : `{"francis": 3, "belle-soeur": 5}`. La preuve que c'était
nécessaire est au dossier — le 18 août 2026, la même soupe miso a reçu un franc
enthousiasme d'un côté de la table et trois étoiles de l'autre, le même soir.
`cout_travail` reste scalaire : sa définition est en minutes actives, donc une
propriété du plat.

**LE LECTEUR COURANT est `francis`**, une ligne de configuration dans
`lib/champs.js` — pas une interface. Une carte de liste ne peut pas afficher un
objet : il lui faut un avis, et c'est celui-là. Le jour où un deuxième lecteur
veut le site à sa mesure, ça devient un sélecteur, et la donnée est déjà prête.

Trois conséquences :

- **`index.json` ne porte que la valeur de ce lecteur** pour `etoiles` et
  `statut_perso`, pas l'objet complet. La fiche seule, elle, garde tout.
- 🔴 **Un avis ABSENT n'est pas un avis négatif** : une fiche dont ce lecteur n'a
  rien dit se lit comme `a-l-essai`, **jamais comme écartée**. Sans cette règle,
  toutes les fiches dont personne ne s'est prononcé disparaîtraient du tri par
  défaut.
- **La page le dit à l'écran** : « les étoiles et le statut sont l'avis de
  Francis, pas une propriété du plat ». Une étoile est l'avis de quelqu'un.

🔴 **`statut_perso` NE SE REMPLIT QUE QUAND UN HUMAIN A MANGÉ LE PLAT. Aucun
document ne l'écrit à l'avance.** La question a été tranchée trois fois et elle
est close : le document 23 avait écrit `a-l-essai` sur les fiches neuves, le 24
les avait remises à `{}`, le 28 avait re-tranché dans l'autre sens, et **le
document 29 referme dans le sens du 24 — avec l'argument qui manquait.**

`{}` dit « personne ne s'est prononcé »; `a-l-essai` dit « ce lecteur a jugé le
plat récent et veut l'essayer ». Écrire le second sur une fiche que personne n'a
cuisinée fait dire à la donnée quelque chose de faux. **Et la raison qui semblait
la justifier — « les fiches neuves sont proposées activement » — est une
propriété du DOCUMENT qui les a écrites, pas une propriété de la fiche.** La
récence est déjà dans la donnée sans champ supplémentaire : **l'identifiant
l'encode**, `R133` est plus récente que `R84`, qui est plus récente que `R25`.

**Rien ne change à l'écran** dans un cas comme dans l'autre, puisqu'un avis
absent se lit déjà `a-l-essai` : ce qui change est ce que la donnée prétend. Le
jour où le dossier voudra distinguer « proposé récemment », **ce sera un autre
champ, et il faudra une meilleure raison que celle-là.**

⚠️ **`statut_perso` n'est PAS `statut`, et c'est la distinction la plus importante
du schéma.** `statut` juge l'exactitude de la fiche : `retiré` veut dire que ce
qu'elle affirme est faux ou dépassé. `statut_perso` juge le plat, pour un lecteur.
**Une fiche parfaitement exacte qu'un lecteur n'aime pas reste `actif` et devient
`ecarte` pour lui** — retirer une fiche exacte parce qu'une personne n'aime pas le
plat détruit de l'information pour tous les autres lecteurs. Trois fiches sont
exactement dans ce cas : `R45`, `R47` et `R67`, actives et écartées.

Les cinq valeurs, et ce que chacune commande à la planification : `a-l-essai`
(moins de deux exécutions — une par semaine au plus) · `au-repertoire` (rotation
régulière) · `de-service` (correct, pas réclamé, **mais disponible** : ne se
planifie que pour écouler un ingrédient ou combler un trou) · `suspendu` (écarté
**sous réserve d'un essai précis**) · `ecarte` (ne revient plus).

`suspendu` existe pour le cas où le verdict est négatif mais l'essai mauvais. Le
goma-ae `R44` a été jugé sur un bol composé presque uniquement de côtes pâles de
chou nappa — le pire cas du plat. Ce n'est pas un verdict sur le goma-ae, c'est un
verdict sur des côtes de nappa blanchies, et `ecarte` mentirait.

**`motif_statut` est obligatoire quand `statut_perso` vaut `suspendu` ou `ecarte`,
et la règle 21 le vérifie.** Sans lui, on ne distingue pas « je n'aime pas ce
plat » de « je n'aime pas la façon dont je l'ai fait ».

**`ajustement`** est un sixième champ, hors des deux blocs : comment le plat se
fait réellement à la maison, quand ça diffère de la fiche. **La fiche reste la
référence ; l'ajustement est la version de la maison.** Ces écarts vivaient dans
les notes, mêlés aux explications ; séparés, ils se lisent d'un coup et une
machine peut les utiliser.

**Le remplissage n'est pas un travail d'agent seul.** Les champs descriptifs se
déduisent de la lecture des fiches — c'est mécanique et vérifiable. `etoiles`,
`cout_travail` et `statut_perso` viennent de Francis et de personne d'autre, et
**ne se remplissent pas de mémoire en bloc.**

## Les temps composés

`temps_minutes.preparation`, `.cuisson` et `.attente` sont des nombres — ou une
**fourchette** `{"min": 40, "max": 75}`. La fourchette existe parce que `R56`
portait deux méthodes de cuisson allant de 40 à 75 minutes sous un seul
`temps_affiche` de « ≈ 47 min », **un chiffre faux pour les deux.** Une fiche à
méthode unique ne change pas.

`temps_affiche` porte alors la fourchette en clair (« ≈ 40 à 75 min »).
`index.json` additionne la **borne haute** : l'index sert à choisir un plat pour un
soir donné, et c'est la borne haute qui décide si on a le temps. La règle 21
vérifie la forme et que `min` ne dépasse pas `max`.

⚠️ **C'EST UNE FORME LÉGITIME, PAS UNE ERREUR À CORRIGER**, et c'est pour ça
qu'elle est écrite ici. Une seule fiche du recueil la porte — `R56`, la patate
douce rôtie, parce qu'une patate de 300 g et une de 600 g ne rôtissent pas dans le
même temps. **Une forme légitime non documentée finit par être « corrigée » par
quelqu'un qui la prend pour une faute**, et le `B58` du document 34 a posé la
question dans ce sens précis. La réponse est : elle était déjà documentée ici et
déjà admise par la règle 21 — rien à changer, sinon le dire.

### 🔴 `vitesse` se DÉRIVE du temps total, elle ne s'écrit plus

**Elle mesure le TEMPS TOTAL ÉCOULÉ, et c'est le bon choix.** C'est ce qu'il faut
pour planifier : une soupe d'une heure quarante-cinq ne s'insère pas dans un
mardi soir, même si elle ne demande que vingt minutes de présence.

**Mais elle a été écrite à la main jusqu'au document 34, et elle avait dérivé sur
un quart du corpus.** Un plat `rapide` à cinquante minutes et un plat `moyen` à
seize coexistaient dans le recueil ; les classes se chevauchaient contre les DEUX
lectures possibles du champ, donc elle n'était fonction d'aucun temps — c'était
une étiquette posée fiche par fiche. **Un champ dérivable écrit à la main dérive**,
et le `S38` du document 34 la fait calculer par `generer.js`, comme `temps_actif`
juste en dessous et comme le `slug`, qui vaut `limace(fr)`.

**Les seuils, sur le total `préparation + cuisson + attente`**, dans
`SEUILS_VITESSE` de `lib/champs.js` — un seul endroit :

| Classe | Total |
|---|---|
| ultra-rapide | ≤ 10 min |
| rapide | ≤ 20 |
| moyen | ≤ 35 |
| long | ≤ 60 |
| extra-long | > 60 |

Ils étalent la distribution, ce qui est le but d'un filtre : `rapide` en portait
plus du tiers du recueil à elle seule avant qu'on les pose. ⚠️ **Ce sont un choix
de goût, pas un fait** — ils se déplacent d'une ligne. Ce qui n'est pas
négociable, c'est qu'un champ dérivable cesse d'être écrit à la main.

🔴 **ELLE VIT DANS `index.json` ET PLUS DANS LA FICHE**, parce que c'est l'index
qui la consomme : c'est une clé de filtre de la page de liste, et la page de fiche
ne l'affiche pas. Une valeur dérivée écrite dans la donnée serait une seconde
source de vérité.

✅ **Et la mauvaise correction a été évitée par un commentaire de code.** Le
premier réflexe était de dériver `vitesse` du temps ACTIF ; c'est le commentaire
du `S35`, déjà écrit dans `generer.js`, qui l'a arrêté en rappelant pourquoi c'est
le temps écoulé qui compte. **Une décision motivée par écrit résiste à la révision
suivante ; une décision tacite non.**

### `attente` veut dire « sans surveillance », et le temps actif s'en déduit

**Ce qui manquait, c'est que le temps de PRÉSENCE ne se voyait pas.** Un plat à
vingt minutes de travail et un plat à quatre-vingt-dix se ressemblaient sur une
carte. C'est le constat du débrief du 18 août 2026 : le second couvert, avec deux
jeunes enfants, avait dit « énormément d'étapes » d'un plat dont le temps affiché
était court. **Le temps de présence et le nombre de gestes décident pour qui
cuisine avec des interruptions.**

Le document 31 (`S35`) le règle **par dérivation et non par un champ de plus** :
le temps actif vaut `préparation + cuisson`, donc le total moins l'attente. La
carte et la fiche l'affichent — « ≈ 1 h 45 · 27 min de travail ». `index.json`
porte la clé `temps_actif`, **et seulement quand elle apprend quelque chose** :
sans attente elle vaudrait le total, donc elle ne s'écrit pas — la même
convention que partout ailleurs dans l'index.

🔴 **CE QUE ÇA EXIGE DE LA DONNÉE, ET C'EST LE PIÈGE : `attente` doit porter le
temps sans surveillance, pas `cuisson`.** La dérivation est exacte sur les onze
fiches qui déclaraient déjà un temps passif dans leur `temps_affiche`, et
**fausse sur trois qui l'avaient écrit dans `cuisson`** : `R139` (1 h 20 de
frémissement), `R131` (45 minutes de cuiseur à riz), `R134` (25 minutes de
pochage). Sans correction, la carte de `R139` aurait annoncé « 107 min de
travail » pour douze minutes de gestes — **exactement le chiffre faux que le
champ existait pour éviter.** Les trois ont été redistribuées au document 31, en
prenant le partage dans leur propre `temps_affiche` : **le total ne change sur
aucune.**

⚠️ **Donc, en écrivant une fiche : un mijotage, une marinade, un four, un
programme de cuiseur, un repos hors du feu vont dans `attente`.** `cuisson` est
le temps où l'on est devant la casserole. Aucune règle ne le vérifie — la
cohérence se lit en comparant `attente` au `temps_affiche`, et c'est ce qu'il
faut faire à la relecture d'un document.

## Le journal

Une entrée porte des champs machine en tête, puis son `corps` en blocs.

- **`id`** — `K-AAAA-MM-JJ-repas`, permanent. La règle 12 vérifie qu'il
  correspond bien à `date` et `repas`.
- **`repas`** — `dejeuner`, `diner`, `souper`, `preparation`, ou `journee`.
- **`entete`** — ce que le lecteur voit (« 10 août 2026 · Souper »). `date` et
  `repas` en sont la lecture machine.
- **`plats`** — les fiches cuisinées. `plats_libelles` porte le nom affiché à
  côté de chaque renvoi ; le paragraphe « Fiches : … » est rendu à partir des
  deux.
- **`fiches_corrigees`** — les fiches que l'entrée a fait corriger. C'est ce qui
  rend vérifiable la règle du dossier selon laquelle une observation qui ne
  corrige rien ne sert à rien. Il se recopiait autrefois des renvois du corps à
  chaque extraction ; depuis que la page est une vue générée, **il s'écrit à la
  main dans `/data`** — et la règle 2 vérifie que chaque identifiant existe.
- **`photos`** — `{ fichier, alt, legende }`. Vide par défaut. Un bloc `figure`
  du corps y renvoie par son rang. Ne jamais y mettre de marqueur.

## Le plan

`guide-5-plan.json` sépare **les chiffres** de **la prose qui les explique**.

`cibles` fait autorité : c'est là qu'on lit 2 000 calories ou 145-165 g de
protéines, pas dans un paragraphe. `sections` raconte. La règle 10 vérifie que
chaque valeur de `cibles` apparaît bien dans la prose et que la répartition par
repas totalise les cibles du jour.

`cibles` ne se rend pas dans la page : modifier un chiffre là ne change rien à
l'affichage, ça fait seulement échouer la règle 10 tant que la prose n'a pas
suivi. C'est voulu.

`sodium_mg_jour` vaut `null` : le guide 5 ne fixe aucune cible de sodium. Y
mettre un chiffre plausible serait précisément l'erreur que la section suivante
interdit.

## Nutrition

`proteines_g` et `calories` sont les valeurs numériques, utilisables pour un
calcul. `proteines_affiche` et `calories_affiche` sont ce que le lecteur voit
(« ≈ 190 / tasse », « ~44 g ») — **les deux doivent rester cohérents.** La règle
13 le vérifie à ±20 %.

Plus précisément : **la valeur numérique est la lecture machine de la chaîne
affichée**, celle que rend `nombre()` de `lib/champs.js` — c'est le premier
nombre du texte, et rien d'autre. La page ne stocke que la chaîne ; le nombre en
est dérivé. La règle 20 le vérifie de fait, puisqu'une divergence est exactement
ce qu'une réextraction corrigerait toute seule.

T9 y a échappé en naissant : le document 14 lui donnait `calories: 0` avec
`calories_affiche: "90 à 180 ajoutées par portion"`. Zéro calorie pour une fiche
dont la leçon centrale est que la friture coûte cher en calories — et
`index.json` publiait ce zéro. Corrigé à 90 au document 16, la borne basse de la
fourchette annoncée ; `variable: true` dit le reste.

`nutrition.source` dit d'où viennent les chiffres :

- `"estime"` — calculé à partir de tables génériques. C'est encore le cas de
  toutes les fiches du recueil.
- `"etiquette"` — relevé sur l'emballage des produits réellement utilisés.
- `"pese"` — pesé et calculé ingrédient par ingrédient.

🔴 **LA SOURCE D'UN TOTAL EST CELLE DE SA COMPOSANTE LA PLUS FAIBLE.** Sans cette
phrase, quelqu'un finira par écrire `etiquette` sur une fiche dont un seul
ingrédient a été lu. Un chiffre de fiche agrège une étiquette lue — le sodium de
la sauce soya — et des ordres de grandeur — le poids du légume, la rétention du
liquide : **dès qu'un poste est estimé, le total l'est.** C'est ce qui explique
que le recueil entier soit encore à `estime` alors que des étiquettes sont lues
depuis le document 19, et c'est pourquoi le champ n'est pas faux mais
**prématuré** : il parlera le jour où une fiche sera pesée.

⚠️ **Et il ne s'affiche donc que hors `estime`** — `S40` du document 34. Voir « Un
champ qui donne la même réponse partout ne s'affiche pas ».

**Le remplissage est opportuniste, jamais rétroactif.** Chaque fois qu'une fiche
est cuisinée, les valeurs réelles des étiquettes sont relevées et la fiche passe
à `"etiquette"`. Au rythme d'une ou deux fiches par jour, les vingt fiches
réellement en rotation sont couvertes en deux semaines — et ce sont les seules
qui comptent.

### 🔴 Le sodium du sel, et la règle de comptage

⚠️ **CE TABLEAU NE SE CITE PLUS DE MÉMOIRE. Il a été faux pendant cinq
documents** — la ligne de la pincée avait été lue comme celle du quart de
cuillère à thé, et tout ce qui portait du sel en cuillères s'est retrouvé
sous-estimé d'un facteur quatre à six. Le sel de table est du chlorure de sodium
à 39,3 % de sodium en masse, et une cuillère à thé rase en pèse 6 g : **il n'y a
aucune approximation là-dedans, c'est de l'arithmétique.**

| Dose de sel de table | Sodium |
|---|---|
| 1 pincée (≈ 1/16 c. à thé) | ≈ 145 mg |
| ⅛ c. à thé | ≈ 290 mg |
| **¼ c. à thé** | **≈ 575 mg** |
| ⅓ c. à thé | ≈ 767 mg |
| ½ c. à thé | ≈ 1 150 mg |
| ¾ c. à thé | ≈ 1 725 mg |
| **1 c. à thé** | **≈ 2 300 mg** |

**Et une cuillère à thé de sauce soya réduite en sodium vaut ≈ 167 mg**, soit
500 mg la cuillère à soupe. C'est l'autre poste qui revient partout.

**COMBIEN DU SEL ÉCRIT DANS LA LISTE COMPTE VRAIMENT — trois cas, et le
deuxième est celui qu'on confond avec le premier :**

| Cas | Ce qu'on compte | Pourquoi |
|---|---|---|
| Le sel **mélangé au plat** | **tout** | il est mangé en entier : assaisonnement, farce, soupe, flan |
| Le sel **dissous dans une eau qu'on jette** | **zéro**, et la fiche le dit | un légume blanchi 40 secondes dans deux litres d'eau salée en absorbe une fraction de pourcent — **la compter serait un faux précis** |
| Le sel d'un **dégorgement éponge** (`T3`) | **≈ 60 %** | une partie part avec l'eau, une partie reste dans la chair. **Chiffre grossier, assumé** — le seul du corpus qu'une pesée corrigerait |

⚠️ **Deux cas ne sont PAS couverts et il ne faut pas les y forcer** : un
dégorgement *rincé* (`R83`) part plus loin que le cas 3 et le recueil le compte à
zéro; **un pochage long dans une eau salée qu'on jette (`R82`, quarante minutes)
n'est ni l'un ni l'autre, et son chiffre reste ouvert.**

**`sodium_mg` est TOUJOURS PAR PORTION**, comme `proteines_g`, `calories` et
`lipides_g` dans le même objet. Ça n'a pas toujours été vrai : douze fiches
portaient un total pour le plat entier dans le même bloc que trois valeurs par
portion, et seule une `note` en texte libre le disait. **C'est l'une des deux
raisons pour lesquelles le facteur quatre a survécu cinq documents.** Si le total
du plat vaut la peine d'être dit, il va dans la `note`, jamais dans le nombre.

⚠️ **Un `sodium_mg` absent s'affiche « non chiffré » et non rien** : la majorité
des fiches n'en portent aucun, et une ligne manquante se lit comme un plat sans
sel. **Le trou doit se voir** — c'est le geste le moins coûteux et le plus utile
des trois qu'on pouvait poser sur ce manque.

⚠️ **AUCUN SUPERLATIF DE CORPUS.** Plus de « le moins salé du recueil » : une
telle phrase compare une fiche aux 38 % du recueil qui portent un chiffre, en
laissant croire que c'est 100 %. Deux formes sont admises — **un chiffre nu**
(« ≈ 130 mg par portion »), qui se vérifie tout seul, et **une comparaison
NOMMÉE** (« moins salé que le namul de `R84` »), que le lecteur peut ouvrir. Ce
qu'on perd est la formule qui frappe; ce qu'on gagne est une phrase qui reste
vraie quand le recueil grandit.

**Ne jamais remplir `lipides_g` ou `sodium_mg` par estimation.** Ils valent
`null` presque partout. `null` veut dire « inconnu », jamais « zéro » : un
`lipides_g: null` ne doit pas être lu comme « ce plat ne contient pas de gras ».
Une estimation déposée dans le fichier qui fait foi se fait ensuite citer comme
une mesure — c'est pire que le trou. La preuve : l'estimation du dossier donnait
aux sardines ~25 g de protéines et 200-700 mg de sodium ; l'étiquette réelle
d'une boîte Kersen de 200 g donne 40 g de protéines, 52 g de lipides et 840 mg
de sodium.

`variable: true` marque les plats de restes, dont l'apport dépend de ce qu'on y
met (R11, l'ochazuke). La règle 5 les laisse passer sans chiffre.

### La nutrition du guide 3

**Les étiquettes sont sur des ingrédients ; les fiches du guide 2 sont des plats.**
C'était le manque le plus coûteux du schéma : il n'existait aucun endroit pour
écrire « la pâte tom yum Por Kwan fait 920 mg par cuillère à soupe ». Ça vivait
dans de la prose, ou nulle part. Le prix : le souper du 21 août 2026 avait été
planifié à 1 000 mg de sodium, le calcul à partir des six étiquettes lues en donne
**≈ 3 588 mg par bol** — un facteur 3,6, dû entièrement à des estimations de
condiments faites de mémoire.

Chaque fiche du guide 3 porte donc un bloc `nutrition` :

```
"nutrition": {
  "base": "100g" | "portion" | "c-a-soupe" | "c-a-the" | "unite",
  "base_g": <nombre ou null>,
  "calories": …, "proteines_g": …, "lipides_g": …,
  "sodium_mg": …, "sucres_g": …, "calcium_mg": …,
  "source": "etiquette" | "pese" | "estime",
  "produit_lu": "<marque et format exacts>",
  "date_lecture": "AAAA-MM-JJ"
}
```

Il ne se rend pas dans la page — le guide 3 sert à trouver un produit en rayon, pas
à calculer un repas. C'est un agent de planification qui le lit, par le manifeste.

**Trois exigences, vérifiées par la règle 21, et chacune répond à une erreur
réelle :**

1. **`base` est obligatoire dès qu'un chiffre est porté.** Un condiment se dose à
   la cuillère, pas aux 100 g ; forcer les 100 g sur une sauce de poisson donne un
   chiffre juste et inutilisable. L'inverse — la cuillère sur un légume — est
   absurde. `source` et `date_lecture` sont obligatoires au même titre.
2. **`produit_lu` est obligatoire quand `source` vaut `etiquette`.** Deux marques
   de sauce d'huîtres n'ont pas le même sodium. Un chiffre sans son produit est un
   chiffre qu'on ne peut ni vérifier ni remplacer.
3. **`null`, jamais zéro.** La même règle que pour le guide 2. `sodium_mg: 0` est
   une affirmation forte ; `null` dit qu'on ne sait pas.

**Un bloc ne mélange pas ses sources.** `source` vaut pour le bloc entier : on n'y
écrit que ce que l'étiquette dit. Les crevettes crues ne portent donc que leur
sodium lu — leur teneur en protéines, connue seulement par estimation, reste
`null`, et le rendement en mg par gramme de protéine se dit dans la note.

`calcium_mg` est dans la liste pour une raison précise : le Premier Protein porte
650 mg de calcium par gobelet, soit 50 % de la valeur quotidienne, le déjeuner de
semaine est bâti dessus cinq jours sur sept, et **rien sur le site ne le savait.**
