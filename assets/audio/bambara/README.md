# Audio bambara (Bamanankan) — voix humaine uniquement

**Jamais de voix système / TTS.** Chaque étape de guide doit être un fichier MP3
enregistré par un locuteur bambara, validé avec un professionnel de santé.

## Convention

```text
assets/audio/bambara/{guideId}/{stepId}.mp3
assets/audio/fr/{guideId}/{stepId}.mp3   # même règle pour le français
```

Exemples :

- `assets/audio/bambara/rcp/securite.mp3`
- `assets/audio/fr/rcp/securite.mp3`

## Brancher un fichier dans l’app

1. Placer le MP3 au bon chemin.
2. L’enregistrer dans `src/lib/guide-audio.ts` :

```ts
const AUDIO_REGISTRY = {
  'bambara/rcp/securite': require('../../assets/audio/bambara/rcp/securite.mp3'),
  'fr/rcp/securite': require('../../assets/audio/fr/rcp/securite.mp3'),
};
```

Sans `require` statique, Metro n’embarque pas le fichier et le bouton affiche
« audio enregistré pas encore disponible ».

## Texte

Les textes bambara des guides sont dans `assets/data/first-aid-guides.json`
(`bm`, `bambaraTitle`, `summaryBm`). Statut : `pending_clinical_validation`
jusqu’à signature d’un relecteur (voir `docs/MEDICAL_CONTENT_REVIEW.md`).

## Qualité d’enregistrement

- Parler lentement, phrase courte, une étape = un fichier
- Silence de début/fin &lt; 0,3 s
- Mono 64–96 kbps MP3 suffit pour le téléphone
- Pas de musique de fond
