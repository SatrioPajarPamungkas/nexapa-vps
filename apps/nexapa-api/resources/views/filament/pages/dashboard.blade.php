<x-filament-panels::page class="fi-dashboard-page nexapa-dashboard-page">
    {{-- Compact operational header - spans 12 cols --}}
    <div class="nexapa-dashboard-header cols-12 col-span-12">
        <div class="nexapa-dashboard-header-main">
            <h1 class="nexapa-dashboard-title">Nexapa Admin</h1>
            <p class="nexapa-dashboard-subtitle">Operational overview and system status</p>
        </div>
        <div class="nexapa-dashboard-header-meta">
            <div class="nexapa-dashboard-links">
                <a href="https://nexapa.app" target="_blank" rel="noopener" class="nexapa-external-link">
                    <span>Open Nexapa</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="nexapa-external-link-icon"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 000-2H5z"/></svg>
                </a>
                <a href="https://app.nexapa.app" target="_blank" rel="noopener" class="nexapa-external-link">
                    <span>Open User App</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="nexapa-external-link-icon"><path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/><path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 000-2H5z"/></svg>
                </a>
            </div>
            <div class="nexapa-last-updated">
                <span class="nexapa-last-updated-dot"></span>
                <span>Last updated {{ now()->format('H:i · d M Y') }}</span>
            </div>
        </div>
    </div>

    {{-- 12-column grid: 8/4 layout --}}
    <x-filament-widgets::widgets
        :columns="$this->getColumns()"
        :data="$this->getWidgetData()"
        :widgets="$this->getVisibleWidgets()"
    />
</x-filament-panels::page>
