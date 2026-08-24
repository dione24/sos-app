# Runbook QA device — 30 à 60 minutes

Éditeur : SahelPay Technologies · App gratuite  
Cibles : au moins **1 Android** (TECNO ou autre) + **1 iPhone** pour la V1 multi-plateforme.

Cocher au fur et à mesure. Reporter les échecs à support@sahelpay.ml (interne).

## A. Installation

- [ ] Build release / TestFlight ou APK preview non-Debug
- [ ] Premier lancement : onboarding ou « Accéder au SOS sans dossier »
- [ ] Redémarrage app : base SQLCipher rouvre sans crash

## B. SOS (critique)

- [ ] Gros bouton SOS accueil + FAB
- [ ] Consentement position : accepter / refuser
- [ ] GPS timeout ≤ 10 s, appel toujours possible pendant la recherche
- [ ] Appel 122 (médical) + confirmation ; annuler sans crash
- [ ] Appel 101 (agression)
- [ ] SMS sans contacts → message + ouverture composeur vide
- [ ] SMS avec 1–2 contacts valides (pas seulement +223)
- [ ] Mesh : consentement BLE → diffusion ou mode dégradé clair
- [ ] « Voir le relais » puis **retour** pour appeler encore

## C. Dossier médical

- [ ] Créer dossier, contacts, includeInSos
- [ ] Modifier puis **abandonner** → restore
- [ ] Export fichier + import V2
- [ ] QR si payload ≤ limite

## D. Guides & RCP

- [ ] Ouvrir un guide long, scroll texte, TTS FR, appel secours
- [ ] RCP : démarrer, son/vibration, **maintenir pour arrêter**, garde anti-relance
- [ ] Bouton **Appeler le 122** depuis RCP

## E. Carte & météo

- [ ] Liste lieux + badge Bamako ou GPS
- [ ] Fiche lieu : Y aller (et Appeler si numéro)
- [ ] Météo cache / réseau / indisponible (pas de faux °C)

## F. Relais

- [ ] Consentement BLE
- [ ] Secouriste : tri local des alertes
- [ ] SMS de relais prérempli
- [ ] Expand alerte → carte / SMS

## G. Confidentialité

- [ ] Double confirm effacement
- [ ] Retour onboarding, données absentes

## H. Accessibilité

- [ ] Taille texte système élevée (≈ 200 %)
- [ ] TalkBack / VoiceOver : SOS, appel, onglets

## I. Multi-appareils (bloquant mesh « réel »)

- [ ] 3 Android pour 3 sauts BLE — **sinon ne pas annoncer multi-hop garanti**
- [ ] 1 iPhone : scan / limites advertising documentées

## J. iOS spécifique

- [ ] Permissions localisation / Bluetooth / photos
- [ ] Appels et SMS ouvrent les apps système
- [ ] SecureStore / SQLCipher après kill app
- [ ] Pas de crash en arrière-plan court

## Signature de test

| Date | Testeur | Appareil | OS | Build | Résultat |
| --- | --- | --- | --- | --- | --- |
| | Abdoulaye NIANGALY | | | | |
