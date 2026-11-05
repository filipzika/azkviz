# Hexkvíz

Vědomostní hra pro dva týmy na trojúhelníkové desce z 28 hexagonů, inspirovaná formátem AZ-kvízu.
Běží čistě lokálně v prohlížeči, nepotřebuje internet ani instalaci.

Hra má **dvě okna**:

| Okno | Soubor | Kde | Co ukazuje |
|---|---|---|---|
| Moderátor | `index.html` | tvůj monitor | otázku, správnou odpověď, desku na klikání, ovládání |
| Projektor | `projektor.html` | projektor | desku, týmy, skóre, kdo je na tahu, časovač |

## Spuštění

1. Otevři `index.html` (dvojklikem, nejlépe v Chrome nebo Edge).
2. Klikni na **📽 Otevřít projektor** (nebo klávesa `P`).
3. Nové okno přetáhni na projektor a stiskni v něm `F` (nebo dvojklik) – celá obrazovka.
4. Dole u moderátora musí svítit **✓ Projektor připojen**.

> Pokud prohlížeč okno zablokuje, povol vyskakovací okna. Kdyby spojení přes `file://` nefungovalo,
> spusť ve složce `python -m http.server 8765` a otevři `http://localhost:8765`.

Zvuky hraje okno projektoru – prohlížeč je povolí až po prvním kliknutí do toho okna.

## Pravidla

- Týmy se střídají. Tým na tahu si vybere číslo pole, moderátor na něj klikne.
- **Prázdné pole** → běžná otázka.
  - Správně → pole získá tým na tahu.
  - Špatně nebo bez odpovědi → může odpovídat soupeř. Správně → pole je jeho, špatně → pole zčerná.
    Soupeř může odpovídat **odmítnout** – pole pak hned zčerná.
    (Šanci pro soupeře lze vypnout v nastavení, pak špatná odpověď = rovnou černé pole.)
- **Černé pole** → otázka ANO / NE. Správně → pole získá tým na tahu, špatně → získá ho soupeř.
- Vyhrává tým, jehož souvislá řada polí spojí **všechny tři strany** trojúhelníku.

## Ovládání moderátora

| Klávesa | Akce |
|---|---|
| klik na pole | tým si vybral toto pole (vytáhne se otázka) |
| pravé tlačítko / Shift + klik | ruční úprava pole |
| `1` / `2` | správně / špatně (nebo bez odpovědi) |
| `3` | soupeř odmítá odpovídat → černé pole |
| `T` | spustit / pozastavit časovač |
| `R` | časovač znovu od začátku |
| `N` | jiná otázka (stávající zůstane použitá) |
| `O` | ukázat / skrýt správnou odpověď na projektoru |
| `Esc` | zrušit výběr pole |
| `Mezerník` | přepnout tým na tahu |
| `Ctrl + Z` | zpět |
| `L` | správa otázek |
| `S` | nastavení |
| `P` | otevřít projektor |

**Otázky se neopakují** – každá otevřená otázka se označí jako použitá a nevrátí se ani v další hře.
Obnovit je lze v Nastavení → *Obnovit všechny otázky*.

## Nová hra a výběr otázek

Při spuštění (a po kliknutí na **Nová hra**) se otevře dialog, kde nastavíš jména a barvy týmů
a vybereš, **ze kterých témat a okruhů** se budou otázky losovat. Kliknutím na okruh
(např. *Myš*) ho vypneš / zapneš. Dialog ukazuje, kolik volných otázek bude ve hře, a umí
vrátit do hry už použité otázky z vybraných témat.

## Správa otázek

Tlačítko **Správa otázek** (`L`) – otázky jsou rozdělené do **témat** (např. *Počítačové periferie*),
každá otázka má **okruh** (Monitor, Myš…) a **typ**:

- **Běžná** – pro prázdná pole,
- **ANO / NE** – pro černá pole, odpověď musí začínat slovem ANO nebo NE.

Ve správě můžeš:

- přidávat, upravovat (✎) a mazat (🗑) otázky, přesunout otázku do jiného tématu,
- vytvářet, přejmenovávat a mazat témata,
- hromadně vložit otázky, jedna na řádek: `Okruh | Otázka | Odpověď`,
- hledat a filtrovat podle typu, okruhu a stavu, vracet použité otázky do hry (↺),
- **Export / Import** témat do souboru `.json` (záloha, sdílení s kolegy),
- **Export jako otazky.js** – vygeneruje nový soubor [`js/otazky.js`](js/otazky.js); když jím
  nahradíš ten v repozitáři a commitneš ho, tvoje otázky budou výchozí všude.

Úpravy se ukládají v prohlížeči (localStorage). Výchozí otázky z `js/otazky.js` se do nich
automaticky doplňují – kromě těch, které jsi smazal. **Obnovit výchozí** zahodí všechny úpravy.

> Otázky žijí v prohlížeči, ve kterém je upravuješ. Před přechodem na jiný počítač nebo prohlížeč
> si je vyexportuj (nebo použij *Export jako otazky.js* a commitni je).

## Nastavení

Čas na odpověď, čas pro soupeře, čas na ANO/NE, automatický start časovače, šance pro soupeře,
zvuky a zobrazení znění otázky na projektoru.

## Struktura

```
index.html        moderátor
projektor.html    projektor
js/otazky.js      výchozí otázky (témata)
js/databaze.js    databáze otázek (úpravy, import/export)
js/spravce.js     okno Správa otázek
js/deska.js       deska, výpočet výhry, vykreslení
css/              styly
stare-verze/      předchozí jednookenní verze hry
```
