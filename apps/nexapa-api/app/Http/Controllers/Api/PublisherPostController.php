<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BatchScheduleRequest;
use App\Http\Requests\StorePublisherPostRequest;
use App\Http\Resources\MediaAssetResource;
use App\Jobs\PublishPost;
use App\Models\ConnectedAccount;
use App\Models\MediaAsset;
use App\Models\PublisherPost;
use App\Services\Publisher\PublisherReadinessService;
use App\Services\Scheduler\BatchScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PublisherPostController extends Controller
{
    public function __construct(
        private PublisherReadinessService $readinessService,
        private BatchScheduleService $batchScheduleService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get the "active" flag to determine if we're filtering for active posts only
        $activeOnly = $request->query('active', false);

        $query = PublisherPost::where('user_id', $user->id)
            ->with(['connectedAccount', 'mediaAsset'])
            ->orderBy('scheduled_at', 'desc');

        // If active flag is true, only show non-terminal statuses
        if ($activeOnly) {
            $query->whereIn('status', ['draft', 'scheduled', 'queued', 'uploading', 'processing', 'publishing']);
        } else {
            // For non-active (history) views, we'll still order by created_at desc for better UX
            $query->orderBy('created_at', 'desc');
        }

        $status = $request->query('status');
        if ($status) {
            $query->where('status', $status);
        }

        $statuses = $request->query('statuses', []);
        if (is_array($statuses) && count($statuses) > 0) {
            $query->whereIn('status', $statuses);
        }

        $action = $request->query('action');
        if ($action) {
            $query->where('action', $action);
        }

        $platform = $request->query('platform');
        if ($platform) {
            $query->where('platform', $platform);
        }

        $dateFrom = $request->query('date_from');
        if ($dateFrom) {
            $column = $activeOnly ? 'scheduled_at' : 'created_at';
            $query->where($column, '>=', $dateFrom);
        }

        $dateTo = $request->query('date_to');
        if ($dateTo) {
            $column = $activeOnly ? 'scheduled_at' : 'created_at';
            $query->where($column, '<=', $dateTo);
        }

        $search = $request->query('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('caption', 'like', "%{$search}%")
                  ->orWhereHas('connectedAccount', function ($q2) use ($search) {
                      $q2->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $perPage = $request->query('per_page', 50);
        $posts = $query->paginate((int) $perPage);

        $data = collect($posts->items())->map(function ($post) use ($request) {
            $postData = $post->toArray();
            
            if ($post->mediaAsset) {
                $postData['media_asset'] = (new MediaAssetResource($post->mediaAsset))->resolve($request);
            }
            
            if ($post->connectedAccount) {
                $postData['connected_account'] = $post->connectedAccount->toArray();
            }
            
            return $postData;
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $posts->currentPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ],
        ]);
    }

    public function show(Request $request, PublisherPost $publisherPost): JsonResponse
    {
        $post = $publisherPost;
        $this->authorizePost($request->user(), $post);

        return response()->json([
            'data' => $post,
        ]);
    }

    public function store(StorePublisherPostRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();
        $correlationId = (string) Str::uuid();
        $connectedAccount = ConnectedAccount::withTrashed()
            ->where('user_id', $user->id)
            ->find($validated['connected_account_id']);

        if (! $connectedAccount) {
            return $this->failure($request, $correlationId, 'connected_account_not_found', 'Connected account not found.', 404);
        }

        $mediaAsset = isset($validated['media_asset_id'])
            ? MediaAsset::where('user_id', $user->id)->find($validated['media_asset_id'])
            : null;

        if (isset($validated['media_asset_id']) && ! $mediaAsset) {
            return $this->failure($request, $correlationId, 'media_asset_not_found', 'Media asset not found.', 404, $connectedAccount);
        }

        $action = $validated['action'];
        $providerMode = $validated['provider_mode'] ?? null;
        
        $readinessAction = $action;
        if ($action === 'publish_now' && $providerMode === 'upload_as_draft') {
            $readinessAction = 'draft';
        }
        
        $accountReadiness = $this->readinessService->checkForAction($connectedAccount, $readinessAction, (string) $user->id);
        if (! $accountReadiness['ready']) {
            return $this->failure(
                $request,
                $correlationId,
                $accountReadiness['code'],
                $accountReadiness['message'],
                $accountReadiness['http_status'],
                $connectedAccount,
                $mediaAsset,
                $accountReadiness
            );
        }

        if ($connectedAccount->platform === 'facebook') {
            if (! $connectedAccount->isFacebookPage()) {
                return $this->failure(
                    $request,
                    $correlationId,
                    'facebook_page_required',
                    'Only Facebook Page accounts can publish posts.',
                    400,
                    $connectedAccount,
                    $mediaAsset
                );
            }
        }

        if ($mediaAsset) {
            $mediaReadiness = $this->readinessService->checkMedia($mediaAsset, $connectedAccount->platform);
            if (! $mediaReadiness['ready']) {
                return $this->failure(
                    $request,
                    $correlationId,
                    $mediaReadiness['code'],
                    $mediaReadiness['message'],
                    $mediaReadiness['http_status'],
                    $connectedAccount,
                    $mediaAsset,
                    $accountReadiness
                );
            }
        }

        $scheduledAt = $validated['scheduled_at'] ?? null;
        
        if ($action === 'publish_now') {
            if (empty($providerMode)) {
                return $this->failure(
                    $request,
                    $correlationId,
                    'provider_mode_required',
                    'Provider mode is required for publish_now action.',
                    422,
                    $connectedAccount,
                    $mediaAsset,
                    $accountReadiness
                );
            }
        } elseif ($action === 'schedule') {
            $providerMode = 'direct_post';
        } elseif ($action === 'draft') {
            $providerMode = null;
        }

        $privacyLevel = null;
        $disableComment = false;
        $disableDuet = false;
        $disableStitch = false;
        $brandContentToggle = false;
        $brandOrganicToggle = false;
        
        if ($providerMode === 'direct_post') {
            $privacyLevel = $validated['privacy_level'] ?? null;
            $disableComment = $validated['disable_comment'] ?? false;
            $disableDuet = $validated['disable_duet'] ?? false;
            $disableStitch = $validated['disable_stitch'] ?? false;
            $brandContentToggle = $validated['brand_content_toggle'] ?? false;
            $brandOrganicToggle = $validated['brand_organic_toggle'] ?? false;
            
            if ($action === 'publish_now' || $action === 'schedule') {
                if (empty($privacyLevel)) {
                    return $this->failure(
                        $request,
                        $correlationId,
                        'privacy_level_required',
                        'Privacy level is required for Direct Post.',
                        422,
                        $connectedAccount,
                        $mediaAsset,
                        $accountReadiness
                    );
                }
            }
        }

        try {
            $post = DB::transaction(function () use ($user, $connectedAccount, $mediaAsset, $validated, $action, $scheduledAt, $providerMode, $privacyLevel, $disableComment, $disableDuet, $disableStitch, $brandContentToggle, $brandOrganicToggle) {
                $status = match ($action) {
                    'draft' => 'draft',
                    'publish_now' => 'queued',
                    'schedule' => 'scheduled',
                };

                $metadata = $connectedAccount->platform === 'facebook'
                    ? ['post_type' => $validated['post_type']]
                    : [];
                if ($providerMode === 'direct_post') {
                    $metadata = array_merge($metadata, [
                        'privacy_level' => $privacyLevel,
                        'disable_comment' => $disableComment,
                        'disable_duet' => $disableDuet,
                        'disable_stitch' => $disableStitch,
                        'brand_content_toggle' => $brandContentToggle,
                        'brand_organic_toggle' => $brandOrganicToggle,
                    ]);
                }

                $post = PublisherPost::create([
                    'user_id' => $user->id,
                    'connected_account_id' => $connectedAccount->id,
                    'media_asset_id' => $mediaAsset?->id,
                    'platform' => $connectedAccount->platform,
                    'caption' => $validated['caption'] ?? null,
                    'action' => $action,
                    'provider_mode' => $providerMode,
                    'status' => $status,
                    'scheduled_at' => $scheduledAt,
                    'metadata' => !empty($metadata) ? $metadata : null,
                ]);

                if ($action === 'publish_now') {
                    PublishPost::dispatch($post)->afterCommit();
                }

                return $post;
            });

            Log::info('Publisher post created', $this->logContext(
                $request,
                $correlationId,
                $connectedAccount,
                $mediaAsset,
                $accountReadiness,
                null,
                $post->id
            ));

            return response()->json([
                'success' => true,
                'message' => $action === 'publish_now' ? 'Post queued for publishing.' : 'Post created.',
                'data' => [
                    'id' => $post->id,
                    'status' => $post->status,
                    'action' => $post->action,
                ],
            ], $action === 'publish_now' ? 202 : 201);
        } catch (\Throwable $exception) {
            $errorInfo = $exception instanceof QueryException ? $exception->errorInfo : null;

            Log::error('Publisher post creation failed', [
                'exception_class' => $exception::class,
                'sqlstate' => $errorInfo[0] ?? null,
                'error_code' => $errorInfo[1] ?? $exception->getCode(),
                'exception_message' => $this->safeExceptionMessage($exception, $request),
                'platform' => $connectedAccount->platform,
                'post_type' => $validated['post_type'] ?? null,
                'connected_account_id' => $connectedAccount->id,
                'correlation_id' => $correlationId,
            ]);

            return response()->json([
                'success' => false,
                'code' => 'publisher_post_creation_failed',
                'message' => 'The post could not be queued. Try again with the correlation ID if the problem continues.',
                'correlation_id' => $correlationId,
            ], 500);
        }
    }

    private function safeExceptionMessage(\Throwable $exception, StorePublisherPostRequest $request): string
    {
        $message = $exception instanceof QueryException
            ? ($exception->errorInfo[2] ?? $exception->getPrevious()?->getMessage() ?? 'Database query failed.')
            : $exception->getMessage();
        $caption = (string) $request->input('caption', '');

        return $caption === '' ? $message : str_replace($caption, '[redacted]', $message);
    }

    private function failure(
        StorePublisherPostRequest $request,
        string $correlationId,
        string $code,
        string $message,
        int $status,
        ?ConnectedAccount $account = null,
        ?MediaAsset $media = null,
        array $accountReadiness = []
    ): JsonResponse {
        Log::warning('Publisher post rejected', $this->logContext(
            $request,
            $correlationId,
            $account,
            $media,
            $accountReadiness,
            $code
        ));

        return response()->json([
            'success' => false,
            'code' => $code,
            'message' => $message,
            'correlation_id' => $correlationId,
        ], $status);
    }

    private function logContext(
        StorePublisherPostRequest $request,
        string $correlationId,
        ?ConnectedAccount $account,
        ?MediaAsset $media,
        array $accountReadiness,
        ?string $failureCode,
        ?string $postId = null
    ): array {
        return [
            'user_id' => $request->user()?->id,
            'connected_account_id' => $request->input('connected_account_id'),
            'media_asset_id' => $request->input('media_asset_id'),
            'action' => $request->input('action'),
            'provider_mode' => $accountReadiness['provider_mode'] ?? null,
            'account_status' => $account?->status,
            'normalized_scope_names' => $accountReadiness['scopes'] ?? [],
            'media_status' => $media?->status?->value,
            'failure_code' => $failureCode,
            'correlation_id' => $correlationId,
            'publisher_post_id' => $postId,
        ];
    }

    public function update(Request $request, PublisherPost $publisherPost): JsonResponse
    {
        $post = $publisherPost;
        $this->authorizePost($request->user(), $post);

        if (!$post->isDraft()) {
            return response()->json([
                'error' => 'Cannot update',
                'message' => 'Only draft posts can be updated',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'connected_account_id' => ['sometimes', 'string', 'exists:connected_accounts,id'],
            'media_asset_id' => ['sometimes', 'string', 'exists:media_assets,id'],
            'caption' => ['nullable', 'string', 'max:5000'],
            'action' => ['sometimes', Rule::in(['draft', 'publish_now', 'schedule'])],
            'scheduled_at' => ['nullable', 'datetime'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        try {
            DB::transaction(function () use ($post, $request) {
                $updateData = [];

                if ($request->has('connected_account_id')) {
                    $connectedAccount = ConnectedAccount::find($request->connected_account_id);
                    if ($connectedAccount && $connectedAccount->user_id === $post->user_id) {
                        $updateData['connected_account_id'] = $connectedAccount->id;
                        $updateData['platform'] = $connectedAccount->platform;
                    }
                }

                if ($request->has('media_asset_id')) {
                    $mediaAsset = MediaAsset::find($request->media_asset_id);
                    if ($mediaAsset && $mediaAsset->user_id === $post->user_id) {
                        $updateData['media_asset_id'] = $mediaAsset->id;
                    }
                }

                if ($request->has('caption')) {
                    $updateData['caption'] = $request->caption;
                }

                if ($request->has('action')) {
                    $updateData['action'] = $request->action;
                    $updateData['status'] = match ($request->action) {
                        'draft' => 'draft',
                        'publish_now' => 'queued',
                        'schedule' => 'scheduled',
                    };
                }

                if ($request->has('scheduled_at')) {
                    $updateData['scheduled_at'] = $request->scheduled_at;
                }

                if (!empty($updateData)) {
                    $post->update($updateData);
                }
            });

            $post->load(['connectedAccount', 'mediaAsset']);

            return response()->json([
                'data' => $post,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update post',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(Request $request, PublisherPost $publisherPost): JsonResponse
    {
        $post = $publisherPost;
        $this->authorizePost($request->user(), $post);

        if ($post->isCompleted() || $post->isUploading() || $post->isProcessing()) {
            return response()->json([
                'error' => 'Cannot delete',
                'message' => 'Cannot delete a post that is being processed or completed',
            ], 400);
        }

        $post->delete();

        return response()->json([
            'message' => 'Post deleted successfully',
        ]);
    }

    public function cancel(Request $request, PublisherPost $publisherPost): JsonResponse
    {
        $post = $publisherPost;
        $this->authorizePost($request->user(), $post);

        if (!$post->isScheduled()) {
            return response()->json([
                'error' => 'Cannot cancel',
                'message' => 'Only scheduled posts can be cancelled',
                'code' => 'invalid_status',
            ], 409);
        }

        try {
            $claimed = DB::table('publisher_posts')
                ->where('id', $post->id)
                ->where('status', 'scheduled')
                ->lockForUpdate()
                ->update([
                    'status' => 'cancelled',
                    'updated_at' => now(),
                ]);

            if ($claimed === 0) {
                return response()->json([
                    'error' => 'Cannot cancel',
                    'message' => 'Post is being processed by scheduler',
                    'code' => 'post_being_processed',
                ], 409);
            }

            $post->refresh();

            return response()->json([
                'data' => $post,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to cancel',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function reschedule(Request $request, PublisherPost $publisherPost): JsonResponse
    {
        $post = $publisherPost;
        $this->authorizePost($request->user(), $post);

        if (!$post->isScheduled()) {
            return response()->json([
                'error' => 'Cannot reschedule',
                'message' => 'Only scheduled posts can be rescheduled',
                'code' => 'invalid_status',
            ], 409);
        }

        $validator = Validator::make($request->all(), [
            'scheduled_at' => ['required', 'date', 'after:now'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $scheduledAt = \Carbon\Carbon::parse($request->scheduled_at);
        $minScheduledAt = now()->addMinutes(5);
        
        if ($scheduledAt->lt($minScheduledAt)) {
            return response()->json([
                'error' => 'Invalid schedule time',
                'message' => 'Schedule must be at least 5 minutes in the future',
                'code' => 'invalid_schedule_time',
            ], 422);
        }

        try {
            $claimed = DB::table('publisher_posts')
                ->where('id', $post->id)
                ->where('status', 'scheduled')
                ->lockForUpdate()
                ->update([
                    'scheduled_at' => $scheduledAt,
                    'updated_at' => now(),
                ]);

            if ($claimed === 0) {
                return response()->json([
                    'error' => 'Cannot reschedule',
                    'message' => 'Post is being processed by scheduler',
                    'code' => 'post_being_processed',
                ], 409);
            }

            $post->refresh();

            return response()->json([
                'data' => $post,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to reschedule',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    private function authorizePost($user, PublisherPost $post): void
    {
        if ($post->user_id !== $user->id) {
            abort(403, 'Post does not belong to user');
        }
    }

    public function batchSchedule(BatchScheduleRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        try {
            $result = $this->batchScheduleService->createBatchSchedule(
                $user->id,
                $validated['platform'],
                $validated['connected_account_ids'] ?? $validated['connected_account_id'],
                $validated['timezone'],
                $validated['items']
            );

            return response()->json([
                'success' => true,
                'created_count' => $result['created_count'],
                'destination_count' => $result['destination_count'],
                'video_count' => $result['video_count'],
                'posts' => $result['posts'],
            ], 201);
        } catch (\Exception $e) {
            Log::error('Batch schedule failed', [
                'user_id' => $user->id,
                'platform' => $validated['platform'] ?? null,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    public function cancelBatch(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'string', 'exists:publisher_posts,id'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        try {
            $result = $this->batchScheduleService->cancelBatch(
                $user->id,
                $validator->validated()['ids']
            );

            return response()->json([
                'success' => true,
                'cancelled_count' => $result['cancelled_count'],
                'posts' => $result['posts'],
            ]);
        } catch (\Exception $e) {
            Log::error('Batch cancel failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function deleteHistoryBatch(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['required', 'string', 'uuid'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $ids = $validator->validated()['ids'];

        $posts = PublisherPost::where('user_id', $user->id)
            ->whereIn('id', $ids)
            ->get();

        $activeStatuses = ['draft', 'scheduled', 'queued', 'uploading', 'processing'];
        $blockedIds = [];
        $deletableIds = [];

        foreach ($posts as $post) {
            if (in_array($post->status, $activeStatuses, true)) {
                $blockedIds[] = $post->id;
            } else {
                $deletableIds[] = $post->id;
            }
        }

        if (count($blockedIds) > 0) {
            return response()->json([
                'success' => false,
                'error' => 'Active posts cannot be deleted',
                'data' => [
                    'blocked_ids' => $blockedIds,
                    'blocked_count' => count($blockedIds),
                ],
            ], 422);
        }

        if (count($deletableIds) === 0) {
            return response()->json([
                'success' => true,
                'message' => 'No history to delete',
                'data' => [
                    'deleted_count' => 0,
                ],
            ]);
        }

        PublisherPost::whereIn('id', $deletableIds)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Selected history deleted',
            'data' => [
                'deleted_count' => count($deletableIds),
            ],
        ]);
    }

    public function deleteHistoryClear(Request $request): JsonResponse
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'platform' => ['nullable', 'string', 'in:facebook,tiktok,youtube,shopee'],
            'status' => ['nullable', 'string'],
            'action' => ['nullable', 'string', 'in:publish_now,schedule,draft'],
            'provider_mode' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        $activeStatuses = ['draft', 'scheduled', 'queued', 'uploading', 'processing'];
        $terminalStatuses = ['completed', 'published', 'failed', 'cancelled'];

        $query = PublisherPost::where('user_id', $user->id)
            ->whereIn('status', $terminalStatuses);

        if (isset($validated['platform'])) {
            $query->where('platform', $validated['platform']);
        }

        if (isset($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (isset($validated['action'])) {
            $query->where('action', $validated['action']);
        }

        if (isset($validated['provider_mode'])) {
            $query->where('provider_mode', $validated['provider_mode']);
        }

        $blockedCount = (clone $query)->whereIn('status', $activeStatuses)->count();

        if ($blockedCount > 0) {
            return response()->json([
                'success' => false,
                'error' => 'Active posts cannot be deleted',
                'data' => [
                    'blocked_count' => $blockedCount,
                ],
            ], 422);
        }

        $deletedCount = $query->delete();

        return response()->json([
            'success' => true,
            'message' => 'History cleared',
            'data' => [
                'deleted_count' => $deletedCount,
            ],
        ]);
    }
}
