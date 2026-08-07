<x-filament-widgets::widget class="nexapa-publishing-widget">
    <x-filament::section class="nexapa-widget-card">
        <x-slot name="heading">
            <span class="nexapa-widget-title">Publishing Operations</span>
        </x-slot>

        @if($this->totalPosts === 0)
            <div class="nexapa-empty-state">
                <p class="nexapa-empty-text">No publisher posts yet</p>
                <p class="nexapa-empty-subtext">Posts will appear here once created</p>
            </div>
        @else
            @php
                $maxCount = max(array_column($this->statusCounts, 'count') ?: [1]);
            @endphp

            {{-- Segmented status bar --}}
            <div class="nexapa-segmented-bar">
                @foreach($this->statusCounts as $item)
                    @php
                        $pct = $this->totalPosts > 0 ? ($item['count'] / $this->totalPosts) * 100 : 0;
                    @endphp
                    <div class="nexapa-segment"
                         style="width: {{ $pct }}%; background: {{ $item['bg'] }}; min-width: {{ $item['count'] > 0 ? '4px' : '0' }};"
                         title="{{ $item['label'] }}: {{ $item['count'] }}">
                    </div>
                @endforeach
            </div>

            {{-- Legend --}}
            <div class="nexapa-legend-grid">
                @foreach($this->statusCounts as $item)
                    <div class="nexapa-legend-item">
                        <div class="nexapa-legend-left">
                            <span class="nexapa-legend-dot" style="background: {{ $item['color'] }};"></span>
                            <span class="nexapa-legend-label">{{ $item['label'] }}</span>
                        </div>
                        <span class="nexapa-legend-count" style="color: {{ $item['key'] === 'failed' ? '#ef4444' : ($item['key'] === 'completed' ? '#10b981' : 'inherit') }}">{{ number_format($item['count']) }}</span>
                    </div>
                @endforeach
            </div>

            <div class="nexapa-total-row">
                <span>Total posts</span>
                <strong>{{ number_format($this->totalPosts) }}</strong>
            </div>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
