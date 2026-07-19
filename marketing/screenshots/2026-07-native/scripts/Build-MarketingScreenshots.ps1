param(
    [string]$AssetRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$AssetRoot = (Resolve-Path $AssetRoot).Path
$RepoRoot = (Resolve-Path (Join-Path $AssetRoot '..\..\..')).Path
$RawRoot = Join-Path $AssetRoot 'raw\de-DE'
$StoreRoot = Join-Path $AssetRoot 'play-store\de-DE'
$ListingRoot = Join-Path $AssetRoot 'play-store\listing'
$HomepageRoot = Join-Path $AssetRoot 'homepage'
$FastlaneRoot = Join-Path $RepoRoot 'fastlane\metadata\android\de-DE\images\phoneScreenshots'
$DocsRoot = Join-Path $RepoRoot 'docs\screenshots'
$LogoPath = Join-Path $RepoRoot 'native\app\src\main\res\drawable-nodpi\app_logo.png'
$BrandFontPath = Join-Path $RepoRoot 'native\app\src\main\res\font\kalam_bold.ttf'

@($StoreRoot, $ListingRoot, $HomepageRoot, $FastlaneRoot, $DocsRoot) | ForEach-Object {
    New-Item -ItemType Directory -Path $_ -Force | Out-Null
}

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
    [float]$MinimumSize = 28
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
    [System.Drawing.Color]$BorderColor,
    [float]$Radius = 42
) {
    $image = [System.Drawing.Image]::FromFile($Path)
    try {
        $width = $Height * $image.Width / $image.Height
        $shadowPath = New-RoundedPath ($X + 12) ($Y + 16) $width $Height $Radius
        $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(115, 0, 0, 0))
        $Graphics.FillPath($shadowBrush, $shadowPath)
        $shadowBrush.Dispose()
        $shadowPath.Dispose()

        $screenPath = New-RoundedPath $X $Y $width $Height $Radius
        $state = $Graphics.Save()
        $Graphics.SetClip($screenPath)
        $Graphics.DrawImage($image, [System.Drawing.RectangleF]::new($X, $Y, $width, $Height))
        $Graphics.Restore($state)

        $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(210, $BorderColor), 3)
        $Graphics.DrawPath($borderPen, $screenPath)
        $borderPen.Dispose()
        $screenPath.Dispose()
        $width
    }
    finally {
        $image.Dispose()
    }
}

$fontCollection = [System.Drawing.Text.PrivateFontCollection]::new()
$fontCollection.AddFontFile($BrandFontPath)
$brandFamily = $fontCollection.Families[0]

$items = @(
    [pscustomobject]@{ Name = '01_dashboard'; Source = '01_dashboard.png'; Headline = 'Arbeitszeit auf einen Blick'; Subline = 'Stunden, Saldo und Wochenwerte sofort sehen.'; Accent = '#48D7A2' },
    [pscustomobject]@{ Name = '02_neuer_eintrag'; Source = '03_new_entry.png'; Headline = 'In Sekunden eingetragen'; Subline = 'Zeit, Pause, Tätigkeit und Projekt – fertig.'; Accent = '#8ED7AE' },
    [pscustomobject]@{ Name = '03_pdf_vorschau'; Source = '04_report_preview.png'; Headline = 'Saubere PDFs auf Knopfdruck'; Subline = 'Der fertige Stundenzettel direkt in der Vorschau.'; Accent = '#F59E5B' },
    [pscustomobject]@{ Name = '04_pdf_versand'; Source = '05_share_pdf.png'; Headline = 'Direkt senden oder speichern'; Subline = 'Per Gmail teilen oder als PDF lokal ablegen.'; Accent = '#B6C9FF' },
    [pscustomobject]@{ Name = '05_taetigkeitscodes'; Source = '06_activity_codes.png'; Headline = 'Tätigkeitscodes, die passen'; Subline = 'Eigene Codes anlegen, bearbeiten und wiederverwenden.'; Accent = '#6ED8B1' },
    [pscustomobject]@{ Name = '06_backup'; Source = '08_backup_export.png'; Headline = 'Deine Daten. Deine Wahl.'; Subline = 'Google Drive, Nextcloud oder lokal sichern.'; Accent = '#78CDA8' },
    [pscustomobject]@{ Name = '07_material_you'; Source = '07_appearance.png'; Headline = 'Material You. Ganz dein Stil.'; Subline = 'Systemfarben, Hell oder Dunkel – die App passt sich an.'; Accent = '#A5D6B8' },
    [pscustomobject]@{ Name = '08_onboarding'; Source = '11_onboarding.png'; Headline = 'Servus! Schön, dass du da bist.'; Subline = 'Offline, datensparsam und ohne Schnickschnack.'; Accent = '#48D7A2' }
)

$logo = [System.Drawing.Image]::FromFile($LogoPath)
try {
    foreach ($item in $items) {
        $sourcePath = Join-Path $RawRoot $item.Source
        if (-not (Test-Path $sourcePath)) {
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
            Draw-CenteredText $graphics $item.Headline 'Segoe UI Semibold' 50 ([System.Drawing.FontStyle]::Regular) $headlineBrush ([System.Drawing.RectangleF]::new(35, 76, 1010, 64)) 36
            $headlineBrush.Dispose()

            $sublineBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(225, 196, 211, 202))
            Draw-CenteredText $graphics $item.Subline 'Segoe UI' 27 ([System.Drawing.FontStyle]::Regular) $sublineBrush ([System.Drawing.RectangleF]::new(55, 142, 970, 48)) 22
            $sublineBrush.Dispose()

            $accentPen = [System.Drawing.Pen]::new($accent, 6)
            $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
            $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
            $graphics.DrawLine($accentPen, 490, 211, 590, 211)
            $accentPen.Dispose()

            $rawImage = [System.Drawing.Image]::FromFile($sourcePath)
            try { $phoneWidth = 1660 * $rawImage.Width / $rawImage.Height } finally { $rawImage.Dispose() }
            $phoneX = (1080 - $phoneWidth) / 2
            [void](Draw-PhoneScreenshot $graphics $sourcePath $phoneX 242 1660 $accent)

            $outputPath = Join-Path $StoreRoot ($item.Name + '.png')
            $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
            Copy-Item -LiteralPath $outputPath -Destination (Join-Path $FastlaneRoot ($item.Name + '.png')) -Force
        }
        finally {
            $graphics.Dispose()
            $bitmap.Dispose()
        }
    }

    $homepageMap = [ordered]@{
        'onboarding.png' = '11_onboarding.png'
        'neuer_eintrag.png' = '03_new_entry.png'
        'dashboard.png' = '01_dashboard.png'
        'dashboard_detail.png' = '02_week_detail.png'
        'bericht.png' = '04_report_preview.png'
        'backup_setup.png' = '08_backup_export.png'
        'arbeitszeitmodell.png' = '10_work_schedule.png'
        'einstellungen.png' = 'settings_overview.png'
        'hilfe.png' = '09_help.png'
    }

    foreach ($targetName in $homepageMap.Keys) {
        $sourcePath = Join-Path $RawRoot $homepageMap[$targetName]
        Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $HomepageRoot $targetName) -Force
        Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $DocsRoot $targetName) -Force
    }

    $storeIcon = [System.Drawing.Bitmap]::new(512, 512, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $iconGraphics = [System.Drawing.Graphics]::FromImage($storeIcon)
    try {
        $iconGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $iconGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $iconGraphics.Clear((Convert-HexColor '#0B1210'))
        $iconGlow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(40, 72, 215, 162))
        $iconGraphics.FillEllipse($iconGlow, 26, 26, 460, 460)
        $iconGlow.Dispose()
        $iconGraphics.DrawImage($logo, [System.Drawing.RectangleF]::new(54, 54, 404, 404))
        $storeIcon.Save((Join-Path $ListingRoot 'app_icon_512.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $iconGraphics.Dispose()
        $storeIcon.Dispose()
    }

    $feature = [System.Drawing.Bitmap]::new(1024, 500, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $featureGraphics = [System.Drawing.Graphics]::FromImage($feature)
    try {
        $featureGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $featureGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $featureGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $featureCanvas = [System.Drawing.Rectangle]::new(0, 0, 1024, 500)
        $featureGradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            $featureCanvas,
            (Convert-HexColor '#07100B'),
            (Convert-HexColor '#1B5B3D'),
            20
        )
        $featureGraphics.FillRectangle($featureGradient, $featureCanvas)
        $featureGradient.Dispose()

        $featureGlow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(44, 72, 215, 162))
        $featureGraphics.FillEllipse($featureGlow, 720, -260, 610, 610)
        $featureGraphics.FillEllipse($featureGlow, -170, 320, 500, 500)
        $featureGlow.Dispose()

        $featureGraphics.DrawImage($logo, [System.Drawing.RectangleF]::new(70, 80, 340, 340))
        $featureTitleFont = [System.Drawing.Font]::new($brandFamily, 72, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $featureTitleBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 244, 252, 247))
        $featureGraphics.DrawString('eStundnzettl', $featureTitleFont, $featureTitleBrush, 425, 142)
        $featureTaglineFont = [System.Drawing.Font]::new('Segoe UI Semibold', 34, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $featureTaglineBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(235, 192, 217, 202))
        $featureGraphics.DrawString('Damit ka Stund verlorn geht.', $featureTaglineFont, $featureTaglineBrush, 432, 245)
        $featureBenefitFont = [System.Drawing.Font]::new('Segoe UI', 23, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $featureGraphics.DrawString('Offline  •  datensparsam  •  einfach', $featureBenefitFont, $featureTaglineBrush, 435, 315)

        $featureTitleFont.Dispose()
        $featureTitleBrush.Dispose()
        $featureTaglineFont.Dispose()
        $featureTaglineBrush.Dispose()
        $featureBenefitFont.Dispose()
        $feature.Save((Join-Path $ListingRoot 'feature_graphic_1024x500.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $featureGraphics.Dispose()
        $feature.Dispose()
    }

    $hero = [System.Drawing.Bitmap]::new(1600, 900, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $heroGraphics = [System.Drawing.Graphics]::FromImage($hero)
    try {
        $heroGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $heroGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $heroGraphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $heroCanvas = [System.Drawing.Rectangle]::new(0, 0, 1600, 900)
        $heroGradient = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            $heroCanvas,
            (Convert-HexColor '#07100B'),
            (Convert-HexColor '#1C5A3D'),
            25
        )
        $heroGraphics.FillRectangle($heroGradient, $heroCanvas)
        $heroGradient.Dispose()

        $heroGlow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(40, 72, 215, 162))
        $heroGraphics.FillEllipse($heroGlow, 980, -220, 760, 760)
        $heroGraphics.FillEllipse($heroGlow, 520, 560, 620, 620)
        $heroGlow.Dispose()

        $heroGraphics.DrawImage($logo, [System.Drawing.RectangleF]::new(68, 54, 84, 84))
        $heroBrandFont = [System.Drawing.Font]::new($brandFamily, 42, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $heroWhite = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 247, 250, 248))
        $heroGraphics.DrawString('eStundnzettl', $heroBrandFont, $heroWhite, 170, 67)
        $heroBrandFont.Dispose()

        $titleFont = [System.Drawing.Font]::new('Segoe UI Semibold', 70, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $heroGraphics.DrawString("Arbeitszeit.`nEinfach g'macht.", $titleFont, $heroWhite, [System.Drawing.RectangleF]::new(68, 205, 690, 190))
        $titleFont.Dispose()

        $bodyBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 202, 218, 208))
        $bodyFont = [System.Drawing.Font]::new('Segoe UI', 31, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $heroGraphics.DrawString(
            "Eintragen, auswerten und als PDF verschicken – direkt am Handy.",
            $bodyFont,
            $bodyBrush,
            [System.Drawing.RectangleF]::new(72, 425, 640, 105)
        )

        $pillBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(48, 142, 215, 174))
        $pillPath = New-RoundedPath 72 570 520 76 38
        $heroGraphics.FillPath($pillBrush, $pillPath)
        $pillPath.Dispose()
        $pillBrush.Dispose()
        $pillFont = [System.Drawing.Font]::new('Segoe UI Semibold', 27, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
        $heroGraphics.DrawString('Offline • datensparsam • Material You', $pillFont, $heroWhite, 100, 591)
        $pillFont.Dispose()

        [void](Draw-PhoneScreenshot $heroGraphics (Join-Path $RawRoot '04_report_preview.png') 760 210 650 (Convert-HexColor '#F59E5B') 24)
        [void](Draw-PhoneScreenshot $heroGraphics (Join-Path $RawRoot '01_dashboard.png') 1010 78 760 (Convert-HexColor '#48D7A2') 28)
        [void](Draw-PhoneScreenshot $heroGraphics (Join-Path $RawRoot '03_new_entry.png') 1325 188 660 (Convert-HexColor '#8ED7AE') 24)

        $bodyFont.Dispose()
        $bodyBrush.Dispose()
        $heroWhite.Dispose()

        $heroPath = Join-Path $HomepageRoot 'hero_app_overview.png'
        $hero.Save($heroPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Copy-Item -LiteralPath $heroPath -Destination (Join-Path $DocsRoot 'hero_app_overview.png') -Force
    }
    finally {
        $heroGraphics.Dispose()
        $hero.Dispose()
    }
}
finally {
    $logo.Dispose()
    $fontCollection.Dispose()
}

Write-Host "Built $($items.Count) Play Store screenshots, 2 listing graphics, and $($homepageMap.Count + 1) homepage assets."
