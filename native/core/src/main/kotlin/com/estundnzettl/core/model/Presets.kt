package com.estundnzettl.core.model

/**
 * Arbeitszeit-Modelle und Tätigkeitscode-Presets — Port aus
 * src/hooks/constants.ts (WORK_MODELS, WORK_CODE_PRESETS).
 */

val WORK_MODELS: List<WorkModel> = listOf(
    WorkModel(
        id = "38.5-classic",
        label = "38,5h Standard",
        description = "Mo-Do 8,5h / Fr 4,5h",
        days = listOf(0, 510, 510, 510, 510, 270, 0), // So, Mo, Di, Mi, Do, Fr, Sa
    ),
    WorkModel(
        id = "38.5-even",
        label = "38,5h Gleichmäßig",
        description = "Mo-Fr 7,7h (07:42)",
        days = listOf(0, 462, 462, 462, 462, 462, 0),
    ),
    WorkModel(
        id = "38.5-4days",
        label = "4-Tage Woche (Gleich)",
        description = "Mo-Do 9,6h (09:38)",
        days = listOf(0, 578, 578, 578, 577, 0, 0),
    ),
    WorkModel(
        id = "38.5-4days-split",
        label = "4-Tage Woche (10/8,5)",
        description = "Mo-Mi 10h / Do 8,5h",
        days = listOf(0, 600, 600, 600, 510, 0, 0),
    ),
    WorkModel(
        id = "40-classic",
        label = "40h Woche",
        description = "Mo-Fr 8h",
        days = listOf(0, 480, 480, 480, 480, 480, 0),
    ),
    WorkModel(
        id = "custom",
        label = "Benutzerdefiniert",
        description = "Manuelle Eingabe",
        days = listOf(0, 0, 0, 0, 0, 0, 0),
    ),
)

val WORK_CODE_PRESETS: List<WorkCodePreset> = listOf(
    WorkCodePreset(
        id = "kogler",
        name = "Aufzugsbau (Kogler)",
        description = "Tätigkeitscodes für Aufzugsbau und -wartung",
        codes = listOf(
            WorkCode(1, "01 - Schienen, Bunse"),
            WorkCode(2, "02 - Umlenkrollen, Rollenrost"),
            WorkCode(3, "03 - TWR mechanisch"),
            WorkCode(4, "04 - Heber, Joch, Seile"),
            WorkCode(5, "05 - GGW, Fangrahmen, Geschw. Regler"),
            WorkCode(6, "06 - TWR elektrisch, Steuerung"),
            WorkCode(7, "07 - Schachttüren, Schachtverblechung"),
            WorkCode(8, "08 - E-Installation, Schachtlicht"),
            WorkCode(9, "09 - Kabine mechanisch, Türantrieb, Auskleidung"),
            WorkCode(10, "10 - Kabine elektrisch, Lichtschranken, Dachsteuerung"),
            WorkCode(11, "11 - Einstellung, Fertigstellung, TÜV-Abnahme"),
            WorkCode(12, "12 - Transport"),
            WorkCode(13, "13 - Diverses, Besprechung, Vermessung"),
            WorkCode(14, "14 - Wartung"),
            WorkCode(15, "15 - Störung"),
            WorkCode(16, "16 - Garantie"),
            WorkCode(17, "17 - Regie"),
            WorkCode(18, "18 - Materialvorbereitung"),
            WorkCode(19, "19 - Fahrzeit"),
            WorkCode(20, "20 - Diverse Zusätze, Stahlschacht"),
            WorkCode(21, "21 - Reparaturen"),
            WorkCode(22, "22 - Umbau, Sanierungen"),
            WorkCode(23, "23 - TÜV-Mängel"),
            WorkCode(24, "24 - Demontage"),
            WorkCode(25, "25 - Gerüstbau"),
            WorkCode(190, "19 - An/Abreise"),
            WorkCode(70, "70 - Büro"),
        ),
    ),
    WorkCodePreset(
        id = "allgemein",
        name = "Allgemein",
        description = "Einfache Basiscodes für alle Branchen",
        codes = listOf(
            WorkCode(1, "01 - Arbeit"),
            WorkCode(2, "02 - Büro"),
            WorkCode(3, "03 - Besprechung"),
            WorkCode(4, "04 - Fahrzeit"),
            WorkCode(5, "05 - Sonstiges"),
        ),
    ),
    WorkCodePreset(
        id = "leer",
        name = "Leer starten",
        description = "Keine Codes - komplett selbst erstellen",
        codes = emptyList(),
    ),
)
