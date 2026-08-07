<x-filament-widgets::widget class="nexapa-recent-activity-widget">
    <x-filament::section class="nexapa-widget-card">
        <x-slot name="heading">
            <span class="nexapa-widget-title">Recent Activity</span>
        </x-slot>

        @if(empty($this->activities))
            <div class="nexapa-empty-state">
                <div class="nexapa-empty-icon">◷</div>
                <p class="nexapa-empty-text">No activity recorded</p>
                <p class="nexapa-empty-subtext">User actions and publish events will appear here</p>
            </div>
        @else
            <div class="nexapa-activity-list">
                @foreach($this->activities as $activity)
                    <div class="nexapa-activity-item">
                        <div class="nexapa-activity-avatar">{{ $activity['initial'] }}</div>
                        <div class="nexapa-activity-content">
                            <div class="nexapa-activity-title-row">
                                <span class="nexapa-activity-title">{{ \Illuminate\Support\Str::limit($activity['title'], 60) }}</span>
                                @if($activity['platform'])
                                    <span class="nexapa-activity-badge">{{ $activity['platform'] }}</span>
                                @endif
                                @if($activity['status'])
                                    <span class="nexapa-activity-badge nexapa-activity-badge-{{ $activity['status'] === 'failed' ? 'danger' : ($activity['status'] === 'completed' || $activity['status'] === 'success' ? 'success' : 'neutral') }}">{{ $activity['status'] }}</span>
                                @endif
                            </div>
                            <div class="nexapa-activity-meta">
                                <span>{{ $activity['user'] }}</span>
                                <span class="nexapa-activity-dot">·</span>
                                <span title="{{ $activity['created_iso'] }}">{{ $activity['created_at'] }}</span>
                                @if($activity['category'])
                                    <span class="nexapa-activity-dot">·</span>
                                    <span class="nexapa-activity-category">{{ $activity['category'] }}</span>
                                @endif
                            </div>
                        </div>
                    </div>
                @endforeach
            </div>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
