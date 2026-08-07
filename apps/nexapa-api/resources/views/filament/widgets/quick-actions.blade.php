<x-filament-widgets::widget class="nexapa-quick-actions-widget">
    <x-filament::section class="nexapa-widget-card">
        <x-slot name="heading">
            <span class="nexapa-widget-title">Quick Actions</span>
        </x-slot>

        <div class="nexapa-quick-actions">
            @forelse($this->actions as $action)
                <a href="{{ $action['url'] }}" class="nexapa-quick-action nexapa-quick-action-{{ $action['color'] }}">
                    <span class="nexapa-quick-action-label">{{ $action['label'] }}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="nexapa-quick-action-arrow"><path fill-rule="evenodd" d="M7.21 14.78a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/></svg>
                </a>
            @empty
                <div class="nexapa-empty-state">
                    <p class="nexapa-empty-text">No actions available</p>
                </div>
            @endforelse
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
