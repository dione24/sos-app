# Audio français — voix IA naturelle embarquée

La narration française est générée à l'avance avec une voix neuronale puis
embarquée dans l'application. Elle ne dépend pas de la voix du téléphone ni d'une
connexion au moment de l'urgence.

```text
assets/audio/fr/{guideId}/{stepId}.mp3
```

Chaque fichier doit être enregistré dans `src/lib/guide-audio.ts` avec un
`require(...)` statique. La commande de génération est :

```bash
python scripts/generate-french-guide-audio.py
```

Voir `AI_VOICE.md` pour la voix, les réglages et les obligations de revalidation.
