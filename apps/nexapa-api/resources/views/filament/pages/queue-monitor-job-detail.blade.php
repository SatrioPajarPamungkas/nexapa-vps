<div class="space-y-4">
    <div class="grid grid-cols-2 gap-4">
        <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Job Information</h4>
            <dl class="mt-2 space-y-1 text-sm">
                <div class="flex justify-between">
                    <dt class="text-gray-500 dark:text-gray-400">UUID:</dt>
                    <dd class="font-mono text-xs text-gray-900 dark:text-white">{{ $job->uuid }}</dd>
                </div>
                <div class="flex justify-between">
                    <dt class="text-gray-500 dark:text-gray-400">Connection:</dt>
                    <dd class="text-gray-900 dark:text-white">{{ $job->connection }}</dd>
                </div>
                <div class="flex justify-between">
                    <dt class="text-gray-500 dark:text-gray-400">Queue:</dt>
                    <dd class="text-gray-900 dark:text-white">{{ $job->queue }}</dd>
                </div>
                <div class="flex justify-between">
                    <dt class="text-gray-500 dark:text-gray-400">Job Class:</dt>
                    <dd class="text-gray-900 dark:text-white">{{ $jobClass }}</dd>
                </div>
                <div class="flex justify-between">
                    <dt class="text-gray-500 dark:text-gray-400">Failed At:</dt>
                    <dd class="text-gray-900 dark:text-white">{{ $job->failed_at->format('d M Y H:i:s') }}</dd>
                </div>
            </dl>
        </div>

        <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Failure Information</h4>
            <dl class="mt-2 space-y-1 text-sm">
                <div class="flex justify-between">
                    <dt class="text-gray-500 dark:text-gray-400">Exception:</dt>
                    <dd class="text-danger-600 dark:text-danger-400">{{ $exceptionClass }}</dd>
                </div>
                <div>
                    <dt class="text-gray-500 dark:text-gray-400">Message:</dt>
                    <dd class="mt-1 text-xs text-gray-900 dark:text-white">{{ $failureSummary }}</dd>
                </div>
            </dl>
        </div>
    </div>

    @if($publisherPost)
    <div class="rounded-lg bg-info-50 p-4 dark:bg-info-900/20">
        <h4 class="text-sm font-medium text-info-700 dark:text-info-400">Related Publisher Post</h4>
        <dl class="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div class="flex justify-between">
                <dt class="text-info-600 dark:text-info-400">ID:</dt>
                <dd class="font-mono text-xs text-gray-900 dark:text-white">{{ $publisherPost->id }}</dd>
            </div>
            <div class="flex justify-between">
                <dt class="text-info-600 dark:text-info-400">Platform:</dt>
                <dd class="text-gray-900 dark:text-white">{{ ucfirst($publisherPost->platform) }}</dd>
            </div>
            <div class="flex justify-between">
                <dt class="text-info-600 dark:text-info-400">Status:</dt>
                <dd class="text-gray-900 dark:text-white">{{ ucfirst($publisherPost->status) }}</dd>
            </div>
            <div class="flex justify-between">
                <dt class="text-info-600 dark:text-info-400">Provider ID:</dt>
                <dd class="text-gray-900 dark:text-white">{{ $publisherPost->provider_publish_id ?: '-' }}</dd>
            </div>
        </dl>
    </div>
    @elseif($publisherPostId)
    <div class="rounded-lg bg-warning-50 p-4 dark:bg-warning-900/20">
        <h4 class="text-sm font-medium text-warning-700 dark:text-warning-400">Related Publisher Post</h4>
        <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">Post ID: {{ $publisherPostId }} - Not safely available for display</p>
    </div>
    @endif

    <div class="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Exception Stack Trace (First 5 frames)</h4>
        <pre class="mt-2 max-h-48 overflow-auto text-xs text-gray-700 dark:text-gray-300">{{ collect(explode("\n", $job->exception))->take(15)->join("\n") }}</pre>
    </div>

    <div class="rounded-lg bg-warning-50 p-4 dark:bg-warning-900/20">
        <h4 class="text-sm font-medium text-warning-700 dark:text-warning-400">Security Notice</h4>
        <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Raw payload and sensitive data are intentionally hidden. Only sanitized information is displayed to prevent exposure of tokens, secrets, or authentication credentials.
        </p>
    </div>

    @if(!$canRetry && $retryBlockedReason)
    <div class="rounded-lg bg-danger-50 p-4 dark:bg-danger-900/20">
        <h4 class="text-sm font-medium text-danger-700 dark:text-danger-400">Retry Blocked</h4>
        <p class="mt-1 text-xs text-gray-600 dark:text-gray-400">{{ $retryBlockedReason }}</p>
    </div>
    @endif
</div>