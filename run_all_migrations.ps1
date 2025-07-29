# PowerShell script to run all SQL migrations in the migrations folder on invoices.db
$migrationFiles = Get-ChildItem -Path "migrations" -Filter *.sql | Sort-Object Name
foreach ($file in $migrationFiles) {
    Write-Host "Running migration: $($file.Name)"
    sqlite3 invoices.db < $file.FullName
}
Write-Host "All migrations applied."
