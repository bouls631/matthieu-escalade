# 🧗 Escalade Matthieu

Application web (PWA) d'entraînement escalade pour Matthieu : **objectif flash 6b+** sur une base de **6a à vue**, en alternant **semaines de salle** et **semaines de bloc**.

Le cycle de 12 semaines contient 6 semaines de salle et 6 semaines sans salle.

## Le programme

**Semaine de salle** (semaines impaires) — mardi et jeudi en salle :

| Jour | Séance |
|---|---|
| Lundi 🖐️ | Doigts modéré (fingerboard, sans charge) |
| Mardi 🏔️ | Salle : **volume 6a à vue** + 2 flash 6b+ au passage |
| Mercredi ☀️ | Récupération active (mobilité, préhension douce, marche) |
| Jeudi 🏔️ | Salle : **flash 6b+**, c'est la séance clé, on sort propre |
| Vendredi 🏠 | Renfo (tractions, pompes, dips, gainage) |
| Samedi 🏃 | Cardio zone 1 + technique de pieds |
| Dimanche 😴 | Repos complet |

**Semaine de bloc** (semaines paires) — pas de salle :

| Jour | Séance |
|---|---|
| Lundi 🧗 | Bloc technique (1) |
| Mardi 🏠 | Renfo (chrono disponible) |
| Mercredi ☀️ | Récupération active |
| Jeudi 🧗 | Bloc (2, optionnel) + format flash |
| Vendredi 🏠 | Renfo léger (gainage, mobilité) |
| Samedi 🖐️ | Fingerboard chargé + cardio (le seul jour sûr pour les doigts) |
| Dimanche 😴 | Repos complet |

Le **fingerboard se déplace** : léger le lundi en semaine de salle (le tendon doit être frais pour mardi), chargé le samedi en semaine de bloc (aucune séance à suivre). Le **renfo** aussi : vendredi en semaine de salle, mardi en semaine de bloc.

## Fonctions

- 🎯 **Niveau réglable de 5c+ à 7a+** — l'objectif flash qui pilote les essais, toujours 3 crans au-dessus de sa base à vue (échauffement, rythme et objectif se déplacent ensemble)
- 📆 **Semaine calculée** depuis la date de lancement, l'alternance salle / bloc se fait toute seule
- 🧠 **Coach** — avis sur les tentatives au niveau objectif uniquement : flasher du 6a n'est pas flasher du 6b+
- 📉 **Profil faible** — taux de flash par profil, le plus faible est priorisé au jeudi
- 🖐️ **Chrono doigts** — mise en place 10 s, travail, repos enchaînés ; poids noté et record par prise
- 🏠 **Chrono renfo** — attend ta validation sur chaque série puis décompte le repos
- ▲ **Mur** — journal de voies (cotation, profil, flash/work/chute, note)
- ◔ **Bilan** — progression, taux de flash, taux par profil, historique, alertes santé des doigts
- 📱 PWA installable, fonctionne hors-ligne
- 💾 Données dans `localStorage`

## Vérification

```
node test_plan.js
```

## Mise en route

Ouvrir `index.html` dans un navigateur, ou déployer sur [GitHub Pages](https://pages.github.com/) :

1. **Settings → Pages** du dépôt `matthieu-escalade`
2. Source : `Deploy from a branch` → `main` / dossier `/ (root)`

## Structure

```
├── index.html           # App complète (une seule page)
├── test_plan.js         # Contrôle du moteur, de l'alternance et du coach (node)
├── manifest.webmanifest # Manifest PWA
├── sw.js                # Service worker (offline / cache)
├── icons/               # Icônes PWA
├── .nojekyll
└── github.txt
```

> L'application de Matthieu est une copie de `Escalade-training-` avec un programme différent. Les deux applications sont indépendantes : aucune donnée n'est partagée.