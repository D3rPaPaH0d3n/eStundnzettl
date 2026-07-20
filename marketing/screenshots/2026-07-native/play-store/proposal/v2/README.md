# Play-Store-Screenshot-Vorschlag V2

Diese Serie bleibt bewusst getrennt vom derzeit veröffentlichten Satz. Die sichtbare App-Oberfläche stammt unverändert aus echten Emulator-Aufnahmen; nur Reihenfolge, Überschriften, Unterzeilen und Rahmen werden neu komponiert.

## Empfohlene Reihenfolge

1. Arbeitszeit in Sekunden erfassen
2. Fertiger Stundenzettel als PDF
3. Überstunden sofort im Blick
4. Offline. Privat. Ohne Account.
5. Backup, wie du es willst
6. PDF direkt senden oder speichern
7. Tätigkeitscodes, die passen
8. Dein Stil mit Material You

Die ersten drei Bilder beantworten damit direkt die wichtigsten Fragen: Wie trage ich Zeit ein, was bekomme ich am Monatsende und wie sehe ich meinen Saldo?

`overview.png` zeigt die komplette Serie in der späteren Store-Reihenfolge auf einen Blick.

Die englische Serie verwendet dieselbe Reihenfolge und Botschaft. Ihre Gesamtvorschau liegt in `overview-en-US.png`; die acht Einzelbilder liegen unter `en-US/`.

## Neubau

```powershell
$path = Resolve-Path .\marketing\screenshots\2026-07-native\scripts\Build-StoreProposalV2.ps1
$root = Resolve-Path .\marketing\screenshots\2026-07-native
& ([ScriptBlock]::Create((Get-Content -Raw -Encoding UTF8 $path))) -AssetRoot $root -Locale de-DE
& ([ScriptBlock]::Create((Get-Content -Raw -Encoding UTF8 $path))) -AssetRoot $root -Locale en-US
```
