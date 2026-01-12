Write-Host "Starting School ERP Production Server..."

# Check if Python is installed
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not in PATH."
    exit 1
}

# Install dependencies if needed (optional check, better to run manually for speed usually, but here we can try)
# pip install -r backend/requirements.txt

# Start backend on port 8000
Set-Location backend
$env:PORT = 8000
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --workers 2
