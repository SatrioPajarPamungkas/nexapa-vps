<div class="filament-pages-page space-y-6">
    {{-- Basic System Information --}}
    <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10">
        <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">System Information</h3>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
                <dt class="text-sm text-gray-500 dark:text-gray-400">Laravel Version</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ $this->getLaravelVersion() }}</dd>
            </div>
            <div>
                <dt class="text-sm text-gray-500 dark:text-gray-400">PHP Version</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ $this->getPhpVersion() }}</dd>
            </div>
            <div>
                <dt class="text-sm text-gray-500 dark:text-gray-400">Environment</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ $this->getAppEnv() }}</dd>
            </div>
            <div>
                <dt class="text-sm text-gray-500 dark:text-gray-400">Database</dt>
                <dd class="text-sm font-medium {{ $this->getDatabaseStatus() === 'Connected' ? 'text-success-600' : 'text-danger-600' }}">
                    {{ $this->getDatabaseStatus() }}
                </dd>
            </div>
            <div>
                <dt class="text-sm text-gray-500 dark:text-gray-400">Queue Connection</dt>
                <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ ucfirst($this->getQueueConnection()) }}</dd>
            </div>
        </dl>
    </div>

    {{-- Heartbeats --}}
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        {{-- Worker Heartbeat --}}
        <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10">
            <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">Queue Worker</h3>
            <dl class="space-y-2">
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500 dark:text-gray-400">Last Heartbeat</dt>
                    <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ $this->getWorkerHeartbeat() ?? 'Unknown' }}</dd>
                </div>
            </dl>
        </div>

        {{-- Scheduler Heartbeat --}}
        <div class="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10">
            <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">Laravel Scheduler</h3>
            <dl class="space-y-2">
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500 dark:text-gray-400">Last Run</dt>
                    <dd class="text-sm font-medium text-gray-900 dark:text-white">{{ $this->getSchedulerHeartbeat() ?? 'Unknown' }}</dd>
                </div>
            </dl>
        </div>
    </div>

    {{-- Info Note --}}
    <div class="rounded-xl bg-gray-50 p-4 ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10">
        <p class="text-sm text-gray-600 dark:text-gray-300">
            Queue worker and scheduler are managed externally by Supervisor.
        </p>
    </div>
</div>