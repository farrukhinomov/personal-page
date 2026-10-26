# Exports every .docx below the given folder to a PDF next to it, using Microsoft Word,
# so the PDF matches the DOCX exactly (fonts, line breaks, page breaks).
param([Parameter(Mandatory)][string]$Folder)

$ErrorActionPreference = 'Stop'
$wdExportFormatPDF = 17
$wdExportOptimizeForPrint = 0
$wdExportCreateHeadingBookmarks = 1

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  foreach ($file in Get-ChildItem -Path $Folder -Recurse -Filter *.docx) {
    $pdf = [IO.Path]::ChangeExtension($file.FullName, '.pdf')
    $doc = $word.Documents.Open($file.FullName, $false, $true)
    try {
      # Arguments: path, format, open after export, optimize for, range, from, to, item,
      # include document properties, keep IRM, bookmarks, structure tags (accessibility and
      # ATS text order), bitmap missing fonts, PDF/A.
      $doc.ExportAsFixedFormat($pdf, $wdExportFormatPDF, $false, $wdExportOptimizeForPrint,
        0, 1, 1, 0, $true, $true, $wdExportCreateHeadingBookmarks, $true, $true, $false)
      Write-Output "wrote $pdf"
    }
    finally {
      $doc.Close($false)
    }
  }
}
finally {
  $word.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
}
