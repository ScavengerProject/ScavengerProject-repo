<#
.SYNOPSIS
  Backup do banco de PRODUÇÃO (MONGO_URI) em arquivo único comprimido.

.DESCRIPTION
  Roda `mongodump` lendo a URI direto de server/.env, para que a SENHA NÃO ENTRE
  no histórico do PowerShell (ConsoleHost_history.txt).

  Duas travas antes de qualquer coisa:

   1. Recusa rodar se o banco da MONGO_URI terminar em "_Dev". Produção e
      homologação vivem no MESMO cluster Atlas, diferindo só por esse sufixo —
      não há isolamento de rede ou credencial protegendo de um engano.
   2. Confere que o mongodump existe antes de tentar conectar.

  Sempre valide o arquivo gerado restaurando num banco descartável e comparando
  com `npm run inventario`. Backup não restaurado não é backup.

.PARAMETER OutDir
  Pasta de destino. Padrão: <perfil do usuário>\backups-gincana.

.PARAMETER DbEsperado
  Se informado, aborta quando o banco da URI for diferente deste nome.

.PARAMETER DryRun
  Valida ambiente, URI e travas, imprime o que faria e sai — sem conectar.

.EXAMPLE
  .\backupProducao.ps1
  .\backupProducao.ps1 -OutDir D:\backups -DbEsperado Gerenciamento_Gincana

.NOTES
  Requer MongoDB Database Tools:  winget install MongoDB.DatabaseTools
  (feche e reabra o terminal depois, para recarregar o PATH)
#>
param(
  [string]$OutDir = (Join-Path $HOME 'backups-gincana'),
  [string]$DbEsperado = '',
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

# server/.env, a partir de server/src/scripts/
$EnvPath = Join-Path $PSScriptRoot '..\..\.env' | Resolve-Path -ErrorAction SilentlyContinue
if (-not $EnvPath) {
  Write-Host "ERRO: não encontrei server/.env (esperado em $PSScriptRoot\..\..\)." -ForegroundColor Red
  exit 1
}

# --- Trava 1: ferramenta instalada ---
if (-not $DryRun -and -not (Get-Command mongodump -ErrorAction SilentlyContinue)) {
  Write-Host 'ERRO: mongodump não encontrado no PATH.' -ForegroundColor Red
  Write-Host '  Instale com: winget install MongoDB.DatabaseTools'
  Write-Host '  Depois FECHE e REABRA o terminal.'
  exit 1
}

# --- Lê MONGO_URI (o \s*=\s* não casa com MONGO_URI_DEV) ---
$linha = Select-String -Path $EnvPath -Pattern '^\s*MONGO_URI\s*=' | Select-Object -First 1
if (-not $linha) {
  Write-Host "ERRO: MONGO_URI não encontrada em $EnvPath" -ForegroundColor Red
  exit 1
}
$uri = ($linha.Line -replace '^\s*MONGO_URI\s*=\s*', '').Trim().Trim('"').Trim("'")

if ($uri -notmatch '^(mongodb(?:\+srv)?://)(?:[^@]*@)?([^/?]+)/([^?]*)') {
  Write-Host 'ERRO: não consegui interpretar a MONGO_URI.' -ForegroundColor Red
  exit 1
}
$hostAlvo = $Matches[2]
$dbAlvo = $Matches[3]

Write-Host ''
Write-Host "  host     : $hostAlvo"
Write-Host "  database : $dbAlvo"
Write-Host ''

# --- Trava 2: nunca "fazer backup de produção" mirando homologação ---
if ($dbAlvo -match '_Dev$') {
  Write-Host "ABORTADO: '$dbAlvo' é o banco de homologação, não o de produção." -ForegroundColor Red
  exit 1
}
if ($DbEsperado -and $dbAlvo -ne $DbEsperado) {
  Write-Host "ABORTADO: a MONGO_URI aponta para '$dbAlvo', mas o esperado era '$DbEsperado'." -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $OutDir)) { New-Item -ItemType Directory -Path $OutDir -Force | Out-Null }
$carimbo = Get-Date -Format 'yyyy-MM-dd_HHmm'
$arquivo = Join-Path $OutDir "$dbAlvo-$carimbo.gz"

if ($DryRun) {
  Write-Host 'DRY RUN — nada foi executado. O comando real seria:' -ForegroundColor Yellow
  Write-Host "  mongodump --uri=<oculta> --archive=`"$arquivo`" --gzip"
  exit 0
}

# O handshake TLS com o Atlas estoura o timeout padrão do mongodump.
$sep = if ($uri -like '*?*') { '&' } else { '?' }
$uriTimeout = "$uri$sep" + 'connectTimeoutMS=60000&serverSelectionTimeoutMS=60000&socketTimeoutMS=120000'

Write-Host "Gerando backup em: $arquivo" -ForegroundColor Cyan
mongodump --uri="$uriTimeout" --archive="$arquivo" --gzip

if ($LASTEXITCODE -ne 0) {
  Write-Host "ERRO: mongodump terminou com código $LASTEXITCODE. Backup NÃO confiável." -ForegroundColor Red
  exit 1
}

$tamanho = [math]::Round((Get-Item $arquivo).Length / 1MB, 2)
Write-Host ''
Write-Host "OK: backup gerado ($tamanho MB)" -ForegroundColor Green
Write-Host "  $arquivo"
Write-Host ''
Write-Host 'PRÓXIMO PASSO — valide restaurando num banco descartável:' -ForegroundColor Yellow
Write-Host "  npm run inventario -- prod                 # o 'antes'"
Write-Host "  mongorestore --uri=`"<uri-sem-db>`" --archive=`"$arquivo`" --gzip ``"
Write-Host "               --nsFrom='$dbAlvo.*' --nsTo='${dbAlvo}_RestoreTest.*'"
Write-Host "  npm run inventario -- ${dbAlvo}_RestoreTest  # tem que bater"
