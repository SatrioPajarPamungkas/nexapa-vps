<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\DeveloperSettingsController;
use App\Http\Controllers\Api\DownloadJobController;
use App\Http\Controllers\Api\DownloadResultController;
use App\Http\Controllers\Api\FacebookPageInsightController;
use App\Http\Controllers\Api\MediaAssetContentController;
use App\Http\Controllers\Api\MediaAssetController;
use App\Http\Controllers\Api\MediaAssetUploadController;
use App\Http\Controllers\Api\PublisherPostController;
use App\Http\Controllers\Api\PublisherReadinessController;
use App\Http\Controllers\Api\PublicArticleController;
use App\Http\Controllers\Api\Worker\WorkerClaimController;
use App\Http\Controllers\Api\Worker\WorkerCompletionController;
use App\Http\Controllers\Api\Worker\WorkerJobController;
use App\Http\Controllers\Api\Worker\WorkerResultsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\InternalCrmEntitlementController;
use App\Http\Controllers\Api\InternalCrmLoginController;
use App\Http\Controllers\Api\InternalCrmAuditController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\GoogleAuthController;
use App\Http\Controllers\Api\OAuth\TikTokOAuthController;
use App\Http\Controllers\Api\OAuth\FacebookOAuthController;
use App\Http\Middleware\EnsureGuestApiAccess;
use App\Http\Middleware\EnsureWorkerToken;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Worker Routes (worker token protected)
Route::prefix('v1/worker')
    ->middleware(EnsureWorkerToken::class)
    ->group(function () {
        Route::post('download-jobs/claim', [WorkerClaimController::class, 'store']);
        Route::post('download-jobs/{downloadJob}/start', [WorkerJobController::class, 'start']);
        Route::post('download-jobs/{downloadJob}/progress', [WorkerJobController::class, 'progress']);
        Route::post('download-jobs/{downloadJob}/heartbeat', [WorkerJobController::class, 'heartbeat']);
        Route::post('download-jobs/{downloadJob}/transition', [WorkerJobController::class, 'transition']);
        Route::post('download-jobs/{downloadJob}/results', [WorkerResultsController::class, 'discover']);
        Route::post('download-jobs/{downloadJob}/complete', [WorkerCompletionController::class, 'complete']);
        Route::post('download-jobs/{downloadJob}/fail', [WorkerCompletionController::class, 'fail']);
    });

// User-facing Routes (guest API access)
Route::prefix('v1')
    ->middleware([
        EnsureGuestApiAccess::class,
        'subscription.active',
    ])
    ->group(function () {
        // Download Jobs
        Route::post('download-jobs', [DownloadJobController::class, 'store']);
        Route::get('download-jobs', [DownloadJobController::class, 'index']);
        Route::get('download-jobs/{downloadJob}', [DownloadJobController::class, 'show']);
        Route::post('download-jobs/{downloadJob}/cancel', [DownloadJobController::class, 'cancel']);
        Route::post('download-jobs/{downloadJob}/analysis-heartbeat', [DownloadJobController::class, 'analysisHeartbeat']);
        Route::post('download-jobs/{downloadJob}/retry', [DownloadJobController::class, 'retry']);
        Route::delete('download-jobs/queue', [DownloadJobController::class, 'clearQueue']);
        Route::delete('download-jobs/{downloadJob}', [DownloadJobController::class, 'destroy']);
        Route::get('download-jobs/{downloadJob}/archive', [DownloadJobController::class, 'archive']);
        Route::post('download-jobs/{downloadJob}/bulk-download', [DownloadJobController::class, 'createBulkDownload']);
        Route::get('download-jobs/{downloadJob}/temporary-content/{outputIndex}', [DownloadJobController::class, 'temporaryContent'])
            ->name('api.v1.download-jobs.temporary-content');

            // Download Batches
            Route::get('download-batches/{batchId}', [\App\Http\Controllers\Api\DownloadBatchController::class, 'show']);
            Route::get('download-batches/{batchId}/archive', [\App\Http\Controllers\Api\DownloadBatchController::class, 'archive']);
            Route::get('download-batches/{batchId}/bulk-archive', [\App\Http\Controllers\Api\DownloadBatchController::class, 'bulkArchive']);

            // Download Batch Actions (user-facing)
            Route::middleware(['auth:sanctum'])->group(function () {
                Route::post('download-batches/{batchId}/cancel', [\App\Http\Controllers\Api\DownloadBatchController::class, 'cancelBatch']);
                Route::post('download-batches/{batchId}/retry-failed', [\App\Http\Controllers\Api\DownloadBatchController::class, 'retryFailedBatch']);
                Route::delete('download-batches/{batchId}', [\App\Http\Controllers\Api\DownloadBatchController::class, 'deleteBatch']);
            });

            // Download All endpoint for profile download jobs
            Route::post('download-jobs/{downloadJob}/download-all', [\App\Http\Controllers\Api\DownloadBatchController::class, 'downloadAll']);

        // Download Results
        Route::get('download-jobs/{downloadJob}/results', [DownloadResultController::class, 'index']);
        Route::post('download-jobs/{downloadJob}/results/select', [DownloadResultController::class, 'select']);

        // Activity Logs
        Route::get('activity-logs', [ActivityLogController::class, 'index']);
    });

// Private server-to-server entitlement endpoint.
Route::get(
    'internal/crm-entitlement',
    [InternalCrmEntitlementController::class, 'show']
)->middleware('throttle:300,1');

// Private CRM login bridge. Credentials are accepted only
// from the Nexapa CRM server carrying the internal key.
Route::post(
    'internal/crm-login',
    [InternalCrmLoginController::class, 'store']
)->middleware('throttle:10,1');

Route::post(
    'internal/crm-audit',
    [InternalCrmAuditController::class, 'store']
)->middleware('throttle:300,1');

// Subscription status remains available when a package expires.
Route::get(
    'v1/subscription',
    [SubscriptionController::class, 'show']
)->middleware(['auth:sanctum']);

// Protected User Routes (Sanctum auth required + email verified)
Route::prefix('v1')
    ->middleware([
        'auth:sanctum',
        'verified',
        'subscription.active',
    ])
    ->group(function () {
        // Collections
        Route::get('collections', [\App\Http\Controllers\Api\CollectionController::class, 'index']);
        Route::get('collections/{collection}', [\App\Http\Controllers\Api\CollectionController::class, 'show']);
        Route::post('collections', [\App\Http\Controllers\Api\CollectionController::class, 'store']);
        Route::patch('collections/{collection}', [\App\Http\Controllers\Api\CollectionController::class, 'update']);
        Route::delete('collections/{collection}', [\App\Http\Controllers\Api\CollectionController::class, 'destroy']);
        Route::post('collections/{collection}/media-assets', [\App\Http\Controllers\Api\CollectionController::class, 'addMediaAssets']);
        Route::delete('collections/{collection}/media-assets', [\App\Http\Controllers\Api\CollectionController::class, 'removeMediaAssets']);

        // Appearance / Wallpaper Manager (Phase 1 + Company scope)
        Route::get('appearance', [\App\Http\Controllers\Api\AppearanceThemeController::class, 'showCurrent']);
        Route::get('appearance/themes', [\App\Http\Controllers\Api\AppearanceThemeController::class, 'index']);
        Route::post('appearance/themes', [\App\Http\Controllers\Api\AppearanceThemeController::class, 'store'])->middleware('throttle:30,1');
        Route::put('appearance/themes/{theme}', [\App\Http\Controllers\Api\AppearanceThemeController::class, 'update'])->middleware('throttle:60,1');
        Route::post('appearance/themes/{theme}/activate', [\App\Http\Controllers\Api\AppearanceThemeController::class, 'activate'])->middleware('throttle:60,1');
        Route::post('appearance/reset', [\App\Http\Controllers\Api\AppearanceThemeController::class, 'reset'])->middleware('throttle:20,1');
        Route::post('appearance/wallpapers', [\App\Http\Controllers\Api\AppearanceWallpaperController::class, 'upload'])->middleware('throttle:10,1');
        Route::get('appearance/wallpapers/{theme}/content', [\App\Http\Controllers\Api\AppearanceWallpaperController::class, 'content'])
            ->name('api.v1.appearance.wallpapers.content');
        Route::delete('appearance/themes/{theme}', [\App\Http\Controllers\Api\AppearanceThemeController::class, 'destroy'])->middleware('throttle:30,1');

        // Connected Accounts
        Route::get('connected-accounts', [\App\Http\Controllers\Api\ConnectedAccountController::class, 'index']);
        Route::get(
            'connected-accounts/{connectedAccount}/facebook-insights',
            FacebookPageInsightController::class
        )->middleware('throttle:60,1');
        Route::post('connected-accounts/{platform}/connect', [\App\Http\Controllers\Api\ConnectedAccountController::class, 'connect']);
        Route::post('connected-accounts/{connectedAccount}/reconnect', [\App\Http\Controllers\Api\ConnectedAccountController::class, 'reconnect']);
        Route::post('connected-accounts/{connectedAccount}/refresh', [\App\Http\Controllers\Api\ConnectedAccountController::class, 'refresh']);
        Route::patch('connected-accounts/{connectedAccount}/default', [\App\Http\Controllers\Api\ConnectedAccountController::class, 'setDefault']);
        Route::delete('connected-accounts/{connectedAccount}', [\App\Http\Controllers\Api\ConnectedAccountController::class, 'destroy']);

        // Publisher Readiness
        Route::get('publisher/readiness', [PublisherReadinessController::class, 'check']);
        Route::get('publisher/accounts/{connectedAccount}/readiness', [PublisherReadinessController::class, 'checkForAccount']);
        Route::get('publisher/accounts/{connectedAccount}/creator-info', [PublisherReadinessController::class, 'creatorInfo']);

        // Media Asset Upload (authenticated)
        Route::post('media-assets/upload', [MediaAssetUploadController::class, 'upload']);
        Route::get('media-assets', [MediaAssetController::class, 'index']);
        Route::get('media-assets/{mediaAsset}', [MediaAssetController::class, 'show']);
        Route::delete('media-assets/{mediaAsset}', [MediaAssetController::class, 'destroy']);
        Route::post('media-assets/bulk-delete', [MediaAssetController::class, 'bulkDestroy']);
        Route::get('media-assets/{mediaAsset}/content', [MediaAssetContentController::class, 'content'])
            ->name('api.v1.media-assets.content');
        Route::get('media-assets/{mediaAsset}/thumbnail', [MediaAssetContentController::class, 'thumbnail'])
            ->name('api.v1.media-assets.thumbnail');

        // Publisher Posts
Route::get('publisher/posts', [PublisherPostController::class, 'index']);
Route::delete('publisher/posts/history/batch', [PublisherPostController::class, 'deleteHistoryBatch']);
Route::delete('publisher/posts/history/clear', [PublisherPostController::class, 'deleteHistoryClear']);
Route::get('publisher/posts/{publisherPost}', [PublisherPostController::class, 'show']);
Route::post('publisher/posts', [PublisherPostController::class, 'store']);
Route::patch('publisher/posts/{publisherPost}', [PublisherPostController::class, 'update']);
Route::delete('publisher/posts/{publisherPost}', [PublisherPostController::class, 'destroy']);
Route::post('publisher/posts/{publisherPost}/cancel', [PublisherPostController::class, 'cancel']);
Route::post('publisher/posts/{publisherPost}/reschedule', [PublisherPostController::class, 'reschedule']);

        // Batch Scheduling
        Route::post('publisher/schedules/batch', [PublisherPostController::class, 'batchSchedule']);
        Route::post('publisher/schedules/cancel-batch', [PublisherPostController::class, 'cancelBatch']);

        // Scheduler Status
        Route::get('publisher/scheduler/status', [\App\Http\Controllers\Api\SchedulerStatusController::class, 'status']);

        // Notifications (user inbox)
        Route::get('notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
        Route::get('notifications/unread-count', [\App\Http\Controllers\Api\NotificationController::class, 'unreadCount']);
        Route::patch('notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'markAllRead']);
        Route::patch('notifications/{notification}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markRead']);

        // Developer Settings (admin only)
            Route::middleware('admin')->group(function () {
                Route::get('developer-settings/tiktok', [DeveloperSettingsController::class, 'getTikTokSettings']);
                Route::post('developer-settings/tiktok', [DeveloperSettingsController::class, 'updateTikTokSettings']);
                Route::get('developer-settings/facebook', [DeveloperSettingsController::class, 'getFacebookSettings']);
                Route::post('developer-settings/facebook', [DeveloperSettingsController::class, 'updateFacebookSettings']);
                Route::post('admin/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'storeAdmin']);
            });
    });

// Public Auth Routes (no auth required)
Route::prefix('v1/auth')->group(function () {
    Route::post('register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:5,1');
});

// Public Appearance Theme (no auth required - for company website)
Route::prefix('v1/public/appearance')->group(function () {
    Route::get('company', [\App\Http\Controllers\Api\PublicAppearanceController::class, 'companyTheme'])
        ->middleware('throttle:60,1');
    Route::get('company/wallpaper/{theme}', [\App\Http\Controllers\Api\PublicAppearanceController::class, 'companyWallpaper'])
        ->middleware('throttle:120,1');
});

// NEXAPA PUBLIC ARTICLES START
Route::prefix('v1/public/articles')
    ->middleware('throttle:120,1')
    ->group(function () {
        Route::get(
            '/',
            [PublicArticleController::class, 'index']
        )->name('api.v1.public.articles.index');

        Route::get(
            'featured',
            [PublicArticleController::class, 'featured']
        )->name('api.v1.public.articles.featured');

        Route::get(
            'categories',
            [PublicArticleController::class, 'categories']
        )->name('api.v1.public.articles.categories');

        Route::get(
            '{article:slug}',
            [PublicArticleController::class, 'show']
        )->name('api.v1.public.articles.show');
    });
// NEXAPA PUBLIC ARTICLES END

// Protected Auth Routes (Sanctum auth required)
Route::prefix('v1/auth')->middleware('auth:sanctum')->group(function () {
    Route::get('me', [AuthController::class, 'me']);
    Route::patch('profile', [AuthController::class, 'updateProfile']);
    Route::post('logout', [AuthController::class, 'logout']);

    // Email Verification (resend and status require auth)
    Route::post('email/verification-notification', [EmailVerificationController::class, 'resend'])
        ->middleware(['throttle:3,10'])
        ->name('verification.send');
    Route::get('email/verify/status', [EmailVerificationController::class, 'status']);
});

// Email Verification Callback (no auth required - manual signature validation)
Route::get('v1/auth/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware(['throttle:10,1'])
    ->name('verification.verify');

// TikTok OAuth Callback (public - state-based authorization)
Route::get('v1/oauth/tiktok/callback', [TikTokOAuthController::class, 'callback'])
    ->middleware('throttle:10,1');

// Facebook OAuth Callback (public - state-based authorization)
Route::get('v1/oauth/facebook/callback', [FacebookOAuthController::class, 'callback'])
    ->middleware('throttle:10,1');

// Google OAuth Routes (public - state-based authorization)
Route::withoutMiddleware([
    \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
])->middleware('web')->prefix('v1/auth/google')->group(function () {
    Route::get('redirect', [GoogleAuthController::class, 'redirect']);
    Route::get('callback', [GoogleAuthController::class, 'callback']);
});
