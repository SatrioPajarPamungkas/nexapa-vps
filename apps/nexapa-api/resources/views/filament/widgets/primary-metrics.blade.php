@php
    // Filament widget context available via $this
@endphp
<x-filament-widgets::widget class="nexapa-primary-metrics-widget">
    <x-filament::section class="nexapa-widget-card nexapa-metrics-section">
        <div class="nexapa-metrics-grid">
            {{-- Total Users --}}
            <div class="nexapa-metric-card">
                <div class="nexapa-metric-label">Total Users</div>
                <div class="nexapa-metric-value">{{ number_format($this->totalUsers) }}</div>
                <div class="nexapa-metric-desc">Registered accounts</div>
            </div>

            {{-- Connected Accounts --}}
            <div class="nexapa-metric-card">
                <div class="nexapa-metric-label">Connected Accounts</div>
                <div class="nexapa-metric-value">{{ number_format($this->connectedAccounts) }}</div>
                <div class="nexapa-metric-desc">Platform connections</div>
            </div>

            {{-- Scheduled / Queued --}}
            <div class="nexapa-metric-card nexapa-metric-accent">
                <div class="nexapa-metric-label">Scheduled / Queued</div>
                <div class="nexapa-metric-value nexapa-metric-value-info">{{ number_format($this->queuedCount) }}</div>
                <div class="nexapa-metric-desc">Awaiting publication</div>
            </div>

            {{-- Failed Posts --}}
            <div class="nexapa-metric-card nexapa-metric-danger {{ $this->failedPostsUrl ? 'nexapa-metric-clickable' : '' }}">
                @if($this->failedPostsUrl)
                    <a href="{{ $this->failedPostsUrl }}" class="nexapa-metric-link-overlay" aria-label="View failed posts"></a>
                @endif
                <div class="nexapa-metric-label nexapa-metric-label-danger">
                    Failed Posts
                    @if($this->failedCount > 0)
                        <span class="nexapa-metric-dot-danger"></span>
                    @endif
                </div>
                <div class="nexapa-metric-value nexapa-metric-value-danger">{{ number_format($this->failedCount) }}</div>
                <div class="nexapa-metric-desc">Require attention</div>
            </div>
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
