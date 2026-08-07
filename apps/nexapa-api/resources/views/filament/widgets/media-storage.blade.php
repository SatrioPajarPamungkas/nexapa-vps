<x-filament-widgets::widget class="nexapa-media-storage-widget">
    <x-filament::section class="nexapa-widget-card">
        <x-slot name="heading">
            <span class="nexapa-widget-title">Media Storage</span>
        </x-slot>

        <div class="nexapa-media-storage">
            <div class="nexapa-media-hero">
                <div class="nexapa-media-hero-main">
                    <span class="nexapa-media-hero-value">{{ $this->totalSizeFormatted }}</span>
                    <span class="nexapa-media-hero-label">{{ number_format($this->totalAssets) }} assets</span>
                </div>
            </div>

            <div class="nexapa-media-stats">
                <div class="nexapa-media-stat">
                    <span class="nexapa-media-stat-dot" style="background:#8b5cf6"></span>
                    <span class="nexapa-media-stat-label">Videos</span>
                    <span class="nexapa-media-stat-value">{{ number_format($this->videoCount) }}</span>
                </div>
                <div class="nexapa-media-stat">
                    <span class="nexapa-media-stat-dot" style="background:#06b6d4"></span>
                    <span class="nexapa-media-stat-label">Images</span>
                    <span class="nexapa-media-stat-value">{{ number_format($this->imageCount) }}</span>
                </div>
                <div class="nexapa-media-stat-divider"></div>
                <div class="nexapa-media-stat">
                    <span class="nexapa-media-stat-dot" style="background:#10b981"></span>
                    <span class="nexapa-media-stat-label">Used</span>
                    <span class="nexapa-media-stat-value">{{ number_format($this->usedMedia) }}</span>
                </div>
                <div class="nexapa-media-stat">
                    <span class="nexapa-media-stat-dot" style="background:#6b7280"></span>
                    <span class="nexapa-media-stat-label">Unused</span>
                    <span class="nexapa-media-stat-value">{{ number_format($this->unusedMedia) }}</span>
                </div>
            </div>

            @if($this->totalAssets > 0 && $this->videoCount === 0 && $this->imageCount === 0)
                <div class="nexapa-media-note">Other media types: {{ number_format($this->totalAssets - $this->videoCount - $this->imageCount) }}</div>
            @endif
        </div>
    </x-filament::section>
</x-filament-widgets::widget>
