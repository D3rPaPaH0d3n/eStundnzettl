param(
    [string]$AssetRoot = (Split-Path -Parent $PSScriptRoot),
    [ValidateSet('de-DE', 'en-US')]
    [string]$Locale = 'de-DE'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$AssetRoot = (Resolve-Path $AssetRoot).Path
$RawRoot = Join-Path $AssetRoot ("raw\$Locale")
$OutputRoot = Join-Path $AssetRoot ("play-store\proposal\v2\$Locale")
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null

function Convert-HexColor([string]$Hex) {
    [System.Drawing.ColorTranslator]::FromHtml($Hex)
}

function New-RoundedPath(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $Radius * 2
    $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
    $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
    $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    $path
}

function Draw-CenteredText(
    [System.Drawing.Graphics]$Graphics,
    [string]$Text,
    [string]$Family,
    [float]$InitialSize,
    [System.Drawing.FontStyle]$Style,
    [System.Drawing.Brush]$Brush,
    [System.Drawing.RectangleF]$Bounds,
    [float]$MinimumSize
) {
    $size = $InitialSize
    do {
        $font = [System.Drawing.Font]::new($Family, $size, $Style, [System.Drawing.GraphicsUnit]::Pixel)
        $measured = $Graphics.MeasureString($Text, $font)
        if ($measured.Width -le $Bounds.Width -or $size -le $MinimumSize) { break }
        $font.Dispose()
        $size -= 2
    } while ($true)

    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
    $Graphics.DrawString($Text, $font, $Brush, $Bounds, $format)
    $format.Dispose()
    $font.Dispose()
}

function Draw-PhoneScreenshot(
    [System.Drawing.Graphics]$Graphics,
    [string]$Path,
    [float]$X,
    [float]$Y,
    [float]$Height,
    [System.Drawing.Color]$BorderColor
) {
    $image = [System.Drawing.Image]::FromFile($Path)
    try {
        $width = $Height * $image.Width / $image.Height
        $radius = 42

        $shadowPath = New-RoundedPath ($X + 12) ($Y + 16) $width $Height $radius
        $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(115, 0, 0, 0))
        $Graphics.FillPath($shadowBrush, $shadowPath)
        $shadowBrush.Dispose()
        $shadowPath.Dispose()

        $screenPath = New-RoundedPath $X $Y $width $Height $radius
        $state = $Graphics.Save()
        $Graphics.SetClip($screenPath)
        $Graphics.DrawImage($image, [System.Drawing.RectangleF]::new($X, $Y, $width, $Height))
        $Graphics.Restore($state)

        $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, $BorderColor), 3)
        $Graphics.DrawPath($borderPen, $screenPath)
        $borderPen.Dispose()
        $screenPath.Dispose()
    }
    finally {
        $image.Dispose()
    }
}

$items = if ($Locale -eq 'en-US') {
    @(
        [pscustomobject]@{ Name = '01_track_work_hours'; Source = '03_new_entry.png'; Headline = 'Track work hours in seconds'; Subline = 'Time, breaks, activity and project — done.'; Accent = '#8ED7AE' },
        [pscustomobject]@{ Name = '02_pdf_timesheets'; Source = '04_report_preview.png'; Headline = 'Ready-to-send PDF timesheets'; Subline = 'Review a month or week, then share or archive.'; Accent = '#F59E5B' },
        [pscustomobject]@{ Name = '03_overtime'; Source = '01_dashboard_positive.png'; Headline = 'See overtime at a glance'; Subline = 'Balance, extra hours and weekly totals made clear.'; Accent = '#48D7A2' },
        [pscustomobject]@{ Name = '04_offline_private'; Source = '11_onboarding.png'; Headline = 'Offline. Private. No account.'; Subline = 'Your work records stay on your device.'; Accent = '#48D7A2' },
        [pscustomobject]@{ Name = '05_backup'; Source = '08_backup_export.png'; Headline = 'Back up your way'; Subline = 'Google Drive, Nextcloud or a local folder.'; Accent = '#78CDA8' },
        [pscustomobject]@{ Name = '06_share_pdf'; Source = '05_share_pdf.png'; Headline = 'Share or save PDFs directly'; Subline = 'Send by email or keep a local copy on your phone.'; Accent = '#B6C9FF' },
        [pscustomobject]@{ Name = '07_activity_codes'; Source = '06_activity_codes.png'; Headline = 'Activity codes that fit'; Subline = 'Create, edit and reuse your own codes.'; Accent = '#6ED8B1' },
        [pscustomobject]@{ Name = '08_material_you'; Source = '07_appearance.png'; Headline = 'Your style with Material You'; Subline = 'System colors, light or dark — your choice.'; Accent = '#A5D6B8' }
    )
} else {
    @(
        [pscustomobject]@{ Name = '01_arbeitszeit_erfassen'; Source = '03_new_entry.png'; Headline = 'Arbeitszeit in Sekunden erfassen'; Subline = 'Zeit, Pause, Tätigkeit und Projekt – fertig.'; Accent = '#8ED7AE' },
        [pscustomobject]@{ Name = '02_pdf_stundenzettel'; Source = '04_report_preview.png'; Headline = 'Fertiger Stundenzettel als PDF'; Subline = 'Monat oder Woche prüfen, senden und archivieren.'; Accent = '#F59E5B' },
        [pscustomobject]@{ Name = '03_ueberstunden'; Source = '01_dashboard.png'; Headline = 'Überstunden sofort im Blick'; Subline = 'Saldo, Mehrarbeit und Wochenwerte übersichtlich.'; Accent = '#48D7A2' },
        [pscustomobject]@{ Name = '04_offline_privat'; Source = '11_onboarding.png'; Headline = 'Offline. Privat. Ohne Account.'; Subline = 'Deine Arbeitszeiten bleiben auf deinem Gerät.'; Accent = '#48D7A2' },
        [pscustomobject]@{ Name = '05_backup'; Source = '08_backup_export.png'; Headline = 'Backup, wie du es willst'; Subline = 'Google Drive, Nextcloud oder lokal sichern.'; Accent = '#78CDA8' },
        [pscustomobject]@{ Name = '06_pdf_versand'; Source = '05_share_pdf.png'; Headline = 'PDF direkt senden oder speichern'; Subline = 'Per E-Mail teilen oder lokal am Handy ablegen.'; Accent = '#B6C9FF' },
        [pscustomobject]@{ Name = '07_taetigkeitscodes'; Source = '06_activity_codes.png'; Headline = 'Tätigkeitscodes, die passen'; Subline = 'Eigene Codes anlegen, bearbeiten und wiederverwenden.'; Accent = '#6ED8B1' },
        [pscustomobject]@{ Name = '08_material_you'; Source = '07_appearance.png'; Headline = 'Dein Stil mit Material You'; Subline = 'Systemfarben, hell oder dunkel – ganz wie du willst.'; Accent = '#A5D6B8' }
    )
}

foreach ($item in $items) {
    $sourcePath = Join-Path $RawRoot $item.Source
    if (-not (Test-Path -LiteralPath $sourcePath)) {
        throw "Missing raw screenshot: $sourcePath"
    }

    $bitmap = [System.Drawing.Bitmap]::new(1080, 1920, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

        $canvas = [System.Drawing.Rectangle]::new(0, 0, 1080, 1920)
        $gradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            $canvas,
            (Convert-HexColor '#07100B'),
            (Convert-HexColor '#163B29'),
            55
        )
        $graphics.FillRectangle($gradient, $canvas)
        $gradient.Dispose()

        $accent = Convert-HexColor $item.Accent
        $glow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(30, $accent))
        $graphics.FillEllipse($glow, -230, 1120, 760, 760)
        $graphics.FillEllipse($glow, 700, -220, 560, 560)
        $glow.Dispose()

        $headlineBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 248, 250, 249))
        Draw-CenteredText $graphics $item.Headline 'Segoe UI Semibold' 50 ([System.Drawing.FontStyle]::Regular) $headlineBrush ([System.Drawing.RectangleF]::new(42, 76, 996, 64)) 34
        $headlineBrush.Dispose()

        $sublineBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(225, 196, 211, 202))
        Draw-CenteredText $graphics $item.Subline 'Segoe UI' 27 ([System.Drawing.FontStyle]::Regular) $sublineBrush ([System.Drawing.RectangleF]::new(55, 142, 970, 48)) 21
        $sublineBrush.Dispose()

        $accentPen = [System.Drawing.Pen]::new($accent, 6)
        $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $graphics.DrawLine($accentPen, 490, 211, 590, 211)
        $accentPen.Dispose()

        $rawImage = [System.Drawing.Image]::FromFile($sourcePath)
        try { $phoneWidth = 1660 * $rawImage.Width / $rawImage.Height } finally { $rawImage.Dispose() }
        $phoneX = (1080 - $phoneWidth) / 2
        Draw-PhoneScreenshot $graphics $sourcePath $phoneX 242 1660 $accent

        $outputPath = Join-Path $OutputRoot ($item.Name + '.png')
        $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

$overview = [System.Drawing.Bitmap]::new(2160, 1920, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$overviewGraphics = [System.Drawing.Graphics]::FromImage($overview)
try {
    $overviewGraphics.Clear((Convert-HexColor '#050A08'))
    $overviewGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    for ($index = 0; $index -lt $items.Count; $index++) {
        $item = $items[$index]
        $imagePath = Join-Path $OutputRoot ($item.Name + '.png')
        $image = [System.Drawing.Image]::FromFile($imagePath)
        try {
            $column = $index % 4
            $row = [Math]::Floor($index / 4)
            $overviewGraphics.DrawImage($image, [System.Drawing.RectangleF]::new($column * 540, $row * 960, 540, 960))
        }
        finally {
            $image.Dispose()
        }
    }
    $overviewName = if ($Locale -eq 'de-DE') { 'overview.png' } else { "overview-$Locale.png" }
    $overview.Save((Join-Path (Split-Path -Parent $OutputRoot) $overviewName), [System.Drawing.Imaging.ImageFormat]::Png)
}
finally {
    $overviewGraphics.Dispose()
    $overview.Dispose()
}

Write-Host "Built $($items.Count) non-destructive Play Store proposal screenshots and overview in $OutputRoot"
