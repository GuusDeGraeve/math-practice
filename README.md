# Reken Idol ⭐

Oefen-app voor optellen en aftrekken tot 20 en tot 100, gemaakt voor een touchscreen-Chromebook.
Hoe sneller het juiste antwoord, hoe meer punten. Punten zijn in te wisselen voor beloningen die de ouder zelf instelt.

## Gebruiken

Open `index.html` in Chrome. Er is geen installatie of build-stap nodig.
Alle gegevens (punten, beloningen, instellingen, statistieken) staan in `localStorage` van die browser.
Maak af en toe een backup via **Ouders → Algemeen → Backup downloaden**.

## Ouder-view

Via de knop **🔒 Ouders** rechtsonder, beschermd met een rekenvraag (bv. 17 × 8) of een zelf gekozen pincode. Daar stel je in:

- welke soorten oefeningen aan staan (tot 10, tot 20 met/zonder brug, tientallen, tot 100 met/zonder brug)
- spelregels: aantal vragen, tijdslimiet, punten, bonus, keuzes of cijferpad, max punten per dag
- beloningen en openstaande aanvragen
- voortgang: juist-percentage, gemiddelde tijd en moeilijkste sommen

## Bestanden

- `index.html`: pagina
- `styles.css`: opmaak
- `app.js`: alle logica
