<x-filament-widgets::widget class="nexapa-needs-attention-widget">
    <x-filament::section class="nexapa-widget-card">
        <x-slot name="heading">
            <span class="nexapa-widget-title">Needs Attention</span>
        </x-slot>

        @if($this->allOperational)
            <div class="nexapa-operational-state">
                <span class="nexapa-green-dot"></span>
                <div>
                    <div class="nexapa-operational-title">All systems operational</div>
                    <div class="nexapa-operational-sub">No issues requiring attention</div>
                </div>
            </div>
        @else
            <div class="nexapa-attention-list">
                @foreach($this->issues as $issue)
                    <div class="nexapa-attention-item nexapa-attention-{{ $issue['color'] }}">
                        <div class="nexapa-attention-item-main">
                            <div class="nexapa-attention-item-title">
                                @if($issue['count'] !== null)
                                    <span class="nexapa-attention-count">{{ number_format($issue['count']) }}</span>
                                @endif
                                {{ $issue['title'] }}
                            </div>
                            <div class="nexapa-attention-item-desc">{{ $issue['explanation'] }}</div>
                        </div>
                        @if($issue['url'])
                            <a href="{{ $issue['url'] }}" class="nexapa-attention-link">
                                View
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5"><path fill-rule="evenodd" d="M7.21 14.78a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>
                            </a>
                        @endif
                    </div>
                @endforeach
            </div>
        @endif
    </x-filament::section>
</x-filament-widgets::widget>
