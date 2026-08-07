<x-filament-widgets::widget class="nexapa-system-health-widget">
    <x-filament::section class="nexapa-widget-card">
        <x-slot name="heading">
            <span class="nexapa-widget-title">System Health</span>
        </x-slot>

        <div class="nexapa-health-grid">
            @foreach($this->checks as $check)
                <div class="nexapa-health-row nexapa-health-{{ $check['state'] }}">
                    <div class="nexapa-health-left">
                        <span class="nexapa-health-dot nexapa-health-dot-{{ $check['state'] }}"></span>
                        <span class="nexapa-health-label">{{ $check['label'] }}</span>
                    </div>
                    <div class="nexapa-health-right">
                        <span class="nexapa-health-status nexapa-health-status-{{ $check['state'] }}">{{ $check['status'] }}</span>
                        <span class="nexapa-health-detail" title="{{ $check['detail'] }}">{{ \Illuminate\Support\Str::limit($check['detail'], 32) }}</span>
                    </div>
                </div>
            @endforeach
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
