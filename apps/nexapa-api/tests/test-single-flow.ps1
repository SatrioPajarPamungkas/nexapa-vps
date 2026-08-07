$API = "http://127.0.0.1:8001/api/v1"
$WORKER_TOKEN = (Get-Content .env | Where-Object { $_ -match "^NEXAPA_WORKER_TOKEN=" } | Select-Object -Last 1) -replace "^NEXAPA_WORKER_TOKEN=", ""
$HEADERS = @{ "Accept" = "application/json"; "Content-Type" = "application/json" }
$WORKER_HEADERS = @{ "Accept" = "application/json"; "Content-Type" = "application/json"; "Authorization" = "Bearer $WORKER_TOKEN" }

function Send-Api {
    param([string]$Method, [string]$Url, [hashtable]$Headers, [string]$Body)
    try {
        $params = @{ Uri = $Url; Method = $Method; Headers = $Headers; UseBasicParsing = $true }
        if ($Body) { $params.Body = $Body }
        $response = Invoke-WebRequest @params
        return @{ Status = $response.StatusCode; Content = ($response.Content | ConvertFrom-Json) }
    } catch {
        $errorContent = $null
        if ($_.Exception.Response) {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errorContent = $reader.ReadToEnd() | ConvertFrom-Json
            $reader.Close()
        }
        return @{ Status = $_.Exception.Response.StatusCode.value__; Content = $errorContent; Error = $_.Exception.Message }
    }
}

Write-Host "=== STEP 1: Create Download Job (single mode) ==="
$createResult = Send-Api "POST" "$API/download-jobs" $HEADERS (@{
    mode = "single"
    urls = @("https://www.tiktok.com/@user/video/7123456789012345678")
    output_format = "mp4"
    quality = "best"
    filename_mode = "original"
} | ConvertTo-Json -Depth 5)
Write-Host "Status: $($createResult.Status)"
Write-Host "Accepted: $($createResult.Content.data.counts.accepted)"
$jobId = $createResult.Content.data.accepted[0].id
Write-Host "Job ID: $jobId"
Write-Host ""

Write-Host "=== STEP 2: Worker Claim Job ==="
$claimResult = Send-Api "POST" "$API/worker/download-jobs/claim" $WORKER_HEADERS (@{
    worker_id = "test-worker-001"
    capabilities = @{
        platforms = @("tiktok", "facebook", "instagram", "youtube")
        modes = @("single", "multiple", "profile")
    }
} | ConvertTo-Json -Depth 5)
Write-Host "Status: $($claimResult.Status)"
$claimedJobId = $claimResult.Content.data.id
Write-Host "Claimed Job: $claimedJobId"
Write-Host ""

Write-Host "=== STEP 3: Worker Start Processing ==="
$startResult = Send-Api "POST" "$API/worker/download-jobs/$claimedJobId/start" $WORKER_HEADERS (@{
    current_stage = "analyzing"
} | ConvertTo-Json)
Write-Host "Status: $($startResult.Status)"
Write-Host "Job Status: $($startResult.Content.data.status)"
Write-Host ""

Write-Host "=== STEP 4: Worker Progress ==="
$progressResult = Send-Api "POST" "$API/worker/download-jobs/$claimedJobId/progress" $WORKER_HEADERS (@{
    progress = 50
    stage = "downloading"
} | ConvertTo-Json)
Write-Host "Status: $($progressResult.Status)"
Write-Host "Progress: $($progressResult.Content.data.progress)"
Write-Host ""

Write-Host "=== STEP 5: Worker Complete (single mode - direct completion) ==="
$completeResult = Send-Api "POST" "$API/worker/download-jobs/$claimedJobId/complete" $WORKER_HEADERS (@{
    media_assets = @(@{
        display_name = "Test Video"
        original_name = "test_video.mp4"
        media_type = "video"
        mime_type = "video/mp4"
        storage_path = "media/test_video.mp4"
        storage_disk = "local"
        file_size = 10485760
        duration_seconds = 120
        source_platform = "tiktok"
        source_url = "https://www.tiktok.com/@user/video/7123456789012345678"
    })
    progress = 100
} | ConvertTo-Json -Depth 5)
Write-Host "Status: $($completeResult.Status)"
Write-Host "Job Status: $($completeResult.Content.data.status)"
Write-Host ""

Write-Host "=== STEP 6: Verify Job Detail ==="
$detailResult = Send-Api "GET" "$API/download-jobs/$claimedJobId" $HEADERS
Write-Host "Status: $($detailResult.Status)"
Write-Host "Status: $($detailResult.Content.data.status)"
Write-Host "Progress: $($detailResult.Content.data.progress)"
Write-Host "Media Assets Count: $($detailResult.Content.data.media_assets.Count)"
Write-Host ""

Write-Host "=== STEP 7: List Media Assets ==="
$mediaResult = Send-Api "GET" "$API/media-assets" $HEADERS
Write-Host "Status: $($mediaResult.Status)"
Write-Host "Total Media Assets: $($mediaResult.Content.meta.total)"
Write-Host ""

Write-Host "=== STEP 8: List Activity Logs ==="
$logResult = Send-Api "GET" "$API/activity-logs" $HEADERS
Write-Host "Status: $($logResult.Status)"
Write-Host "Total Logs: $($logResult.Content.meta.total)"
Write-Host ""

Write-Host "=== SINGLE MODE FLOW COMPLETE ==="
