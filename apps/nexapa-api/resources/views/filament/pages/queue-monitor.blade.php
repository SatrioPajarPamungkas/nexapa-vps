<div class="filament-pages-page">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div class="fi-stats-overview-widget-card rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10">
            <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Queue Connection</div>
            <div class="mt-2 text-lg font-bold text-gray-900 dark:text-white">{{ $this->getQueueConnection() }}</div>
            <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">Default connection</div>
        </div>

        <div class="fi-stats-overview-widget-card rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10">
            <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Jobs</div>
            <div class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{{ $this->getPendingJobsCount() }}</div>
            <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">In queue</div>
        </div>

        <div class="fi-stats-overview-widget-card rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10">
            <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Failed Jobs</div>
            <div class="mt-2 text-3xl font-bold text-danger-600 dark:text-danger-400">{{ $this->getFailedJobsCount() }}</div>
            <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">Requires attention</div>
        </div>
    </div>

    <div class="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-950/5 dark:bg-gray-900 dark:ring-white/10">
        <div class="text-sm text-gray-600 dark:text-gray-300">
            Queue worker is managed externally by Supervisor.
        </div>
    </div>
</div>