<?php

namespace App\Services\OAuth;

use App\Models\ConnectedAccount;
use App\Services\SettingsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;

class FacebookPageSyncService
{
    public function __construct(
        private readonly FacebookOAuthService $facebookOAuthService,
    ) {}

    /**
     * Synchronize all Facebook Pages managed by the admin account.
     *
     * @param ConnectedAccount $adminAccount The Facebook admin account
     * @param string $userId The Nexapa user ID
     * @return array Sync summary
     * @throws RuntimeException
     */
    public function syncPages(ConnectedAccount $adminAccount, string $userId): array
    {
        if (!$adminAccount->isFacebookAdmin()) {
            throw new RuntimeException('Account is not a Facebook admin account.');
        }

        if ((string) $adminAccount->user_id !== (string) $userId) {
            throw new RuntimeException('Admin account does not belong to the specified user.');
        }

        $accessToken = $adminAccount->access_token_encrypted;
        if (empty($accessToken)) {
            throw new RuntimeException('Facebook admin access token is missing.');
        }

        try {
            $managedPages = $this->facebookOAuthService->fetchManagedPages($accessToken);
        } catch (RuntimeException $e) {
            Log::error('Facebook Page sync failed', [
                'phase' => 'fetch_managed_pages',
                'admin_account_id' => $adminAccount->id,
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'fbtrace_id' => $e instanceof FacebookOAuthException ? $e->getFbTraceId() : null,
            ]);
            throw new RuntimeException('Failed to fetch managed Facebook Pages.');
        }

        return $this->reconcilePages($adminAccount, $userId, $managedPages);
    }

    /**
     * Reconcile local Page records with provider data.
     *
     * @param ConnectedAccount $adminAccount
     * @param string $userId
     * @param array $managedPages Pages returned from Facebook API
     * @return array Sync summary
     */
    private function reconcilePages(ConnectedAccount $adminAccount, string $userId, array $managedPages): array
    {
        $summary = [
            'total_returned' => count($managedPages),
            'created' => 0,
            'updated' => 0,
            'reactivated' => 0,
            'marked_disconnected' => 0,
            'failed' => 0,
        ];

        $processedPageIds = [];

        DB::transaction(function () use ($adminAccount, $userId, $managedPages, &$summary, &$processedPageIds) {
            foreach ($managedPages as $page) {
                try {
                    $this->processPage($adminAccount, $userId, $page, $summary, $processedPageIds);
                } catch (\Exception $e) {
                    Log::warning('Facebook Page processing failed', [
                        'page_id' => $page['id'] ?? 'unknown',
                        'admin_account_id' => $adminAccount->id,
                        'user_id' => $userId,
                        'error' => $e->getMessage(),
                    ]);
                    $summary['failed']++;
                }
            }

            $this->markAbsentPagesAsDisconnected($adminAccount, $userId, $processedPageIds, $summary);
        });

        Log::info('Facebook Page synchronization completed', [
            'admin_account_id' => $adminAccount->id,
            'user_id' => $userId,
            'total_returned' => $summary['total_returned'],
            'created' => $summary['created'],
            'updated' => $summary['updated'],
            'reactivated' => $summary['reactivated'],
            'marked_disconnected' => $summary['marked_disconnected'],
            'failed' => $summary['failed'],
        ]);

        return $summary;
    }

    /**
     * Process a single Page record.
     *
     * @param ConnectedAccount $adminAccount
     * @param string $userId
     * @param array $page Page data from Facebook API
     * @param array &$summary Sync summary reference
     * @param array &$processedPageIds Processed Page IDs reference
     */
    private function processPage(
        ConnectedAccount $adminAccount,
        string $userId,
        array $page,
        array &$summary,
        array &$processedPageIds
    ): void {
        $pageId = $page['id'];
        if (empty($pageId)) {
            return;
        }

        $processedPageIds[] = $pageId;

        $existing = ConnectedAccount::withTrashed()
            ->where('user_id', $userId)
            ->where('platform', 'facebook')
            ->where('account_type', 'facebook_page')
            ->where('external_account_id', $pageId)
            ->first();

        if ($existing) {
            $this->updateExistingPage($existing, $adminAccount, $page, $summary);
        } else {
            $this->createNewPage($adminAccount, $userId, $page, $summary);
        }
    }

    /**
     * Update an existing Page record.
     *
     * @param ConnectedAccount $existing
     * @param ConnectedAccount $adminAccount
     * @param array $page
     * @param array &$summary
     */
    private function updateExistingPage(
        ConnectedAccount $existing,
        ConnectedAccount $adminAccount,
        array $page,
        array &$summary
    ): void {
        $wasDisconnected = $existing->status === 'disconnected';

        $existing->display_name = $page['name'];
        $existing->username = $page['username'] ?? null;
        $existing->avatar_url = $page['picture'] ?? null;
        $existing->parent_connected_account_id = $adminAccount->id;
        $existing->access_token_encrypted = $page['access_token'];
        $existing->status = 'connected';
        $existing->is_publishable = true;

        if (!empty($page['tasks'])) {
            $existing->metadata = array_merge($existing->metadata ?? [], [
                'tasks' => $page['tasks'],
                'last_synced_at' => now()->toISOString(),
                'sync_source' => 'facebook_graph_api',
                'source_edge' => $page['source_edge'] ?? null,
                'business_id' => $page['business_id'] ?? null,
                'business_name' => $page['business_name'] ?? null,
            ]);
        } else {
            $existing->metadata = array_merge($existing->metadata ?? [], [
                'last_synced_at' => now()->toISOString(),
                'sync_source' => 'facebook_graph_api',
                'source_edge' => $page['source_edge'] ?? null,
                'business_id' => $page['business_id'] ?? null,
                'business_name' => $page['business_name'] ?? null,
            ]);
        }

        $existing->last_validated_at = now();

        if ($wasDisconnected) {
            $existing->failure_code = null;
            $existing->failure_message = null;
            $summary['reactivated']++;
        } else {
            $summary['updated']++;
        }

        $existing->save();
    }

    /**
     * Create a new Page record.
     *
     * @param ConnectedAccount $adminAccount
     * @param string $userId
     * @param array $page
     * @param array &$summary
     */
    private function createNewPage(
        ConnectedAccount $adminAccount,
        string $userId,
        array $page,
        array &$summary
    ): void {
        $hasDefault = ConnectedAccount::where('user_id', $userId)
            ->where('platform', 'facebook')
            ->where('account_type', 'facebook_page')
            ->where('is_default', true)
            ->exists();

        $newPage = new ConnectedAccount();
        $newPage->id = (string) Str::uuid();
        $newPage->user_id = $userId;
        $newPage->platform = 'facebook';
        $newPage->account_type = 'facebook_page';
        $newPage->parent_connected_account_id = $adminAccount->id;
        $newPage->external_account_id = $page['id'];
        $newPage->display_name = $page['name'];
        $newPage->username = $page['username'] ?? null;
        $newPage->avatar_url = $page['picture'] ?? null;
        $newPage->status = 'connected';
        $newPage->connection_method = 'oauth';
        $newPage->is_default = !$hasDefault;
        $newPage->is_publishable = true;
        $newPage->access_token_encrypted = $page['access_token'];
        $newPage->metadata = [
            'tasks' => $page['tasks'] ?? null,
            'last_synced_at' => now()->toISOString(),
            'sync_source' => 'facebook_graph_api',
        ];
        $newPage->last_validated_at = now();

        $newPage->save();
        $summary['created']++;
    }

    /**
     * Mark Pages that are no longer in the provider response as disconnected.
     *
     * @param ConnectedAccount $adminAccount
     * @param string $userId
     * @param array $processedPageIds Page IDs that were in the provider response
     * @param array &$summary
     */
    private function markAbsentPagesAsDisconnected(
        ConnectedAccount $adminAccount,
        string $userId,
        array $processedPageIds,
        array &$summary
    ): void {
        $absentQuery = ConnectedAccount::where('user_id', $userId)
            ->where('platform', 'facebook')
            ->where('account_type', 'facebook_page')
            ->where('parent_connected_account_id', $adminAccount->id)
            ->where('status', 'connected');

        if (!empty($processedPageIds)) {
            $absentQuery->whereNotIn('external_account_id', $processedPageIds);
        }

        $absentPages = $absentQuery->get();

        foreach ($absentPages as $page) {
            $page->status = 'disconnected';
            $page->failure_code = 'facebook_page_no_longer_managed';
            $page->failure_message = 'This Page is no longer managed by the connected Facebook admin account.';
            $page->metadata = array_merge($page->metadata ?? [], [
                'last_checked_at' => now()->toISOString(),
                'disconnected_at' => now()->toISOString(),
            ]);
            $page->last_validated_at = now();
            $page->save();

            $summary['marked_disconnected']++;
        }
    }
}
