Set-Location "c:\Users\larif\Documents\projetos\habit-tracker-api"

Write-Host "=== npm run build ===" -ForegroundColor Cyan
npm run build
$buildExit = $LASTEXITCODE
Write-Host "Build exit code: $buildExit"

if ($buildExit -eq 0) {
    Write-Host "=== Build OK, committing ===" -ForegroundColor Green
    git add .
    git commit -m "feat: adiciona registro de usuario via Supabase Auth, remove bcryptjs"
    git push
} else {
    Write-Host "=== Build FAILED — aborting commit ===" -ForegroundColor Red
}
