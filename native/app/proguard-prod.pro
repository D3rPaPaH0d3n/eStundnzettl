# Produktions-Variante: Debug- und Info-Logs entfernen (Warnungen und
# Fehler bleiben für Absturzberichte erhalten).
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
