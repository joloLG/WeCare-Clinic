# Base directories
$baseDirs = @(
    "src/features/auth/components",
    "src/features/auth/hooks",
    "src/features/auth/services",
    "src/features/auth/types",
    "src/features/appointments/components",
    "src/features/appointments/hooks",
    "src/features/appointments/services",
    "src/features/appointments/types",
    "src/features/messages/components",
    "src/features/messages/hooks",
    "src/features/messages/services",
    "src/features/messages/types",
    "src/components/ui",
    "src/components/forms",
    "src/components/shared",
    "src/hooks",
    "src/lib/api",
    "src/lib/utils",
    "src/providers",
    "src/stores",
    "src/types",
    "src/utils/supabase"
)

# Create each directory
foreach ($dir in $baseDirs) {
    $fullPath = Join-Path -Path $PSScriptRoot -ChildPath $dir
    if (-not (Test-Path -Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "Created directory: $fullPath"
    } else {
        Write-Host "Directory already exists: $fullPath"
    }
}

Write-Host "Directory structure created successfully!" -ForegroundColor Green
