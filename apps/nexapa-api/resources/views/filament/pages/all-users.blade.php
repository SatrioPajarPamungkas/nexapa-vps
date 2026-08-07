<x-filament-panels::page>
    <div wire:loading.flex class="items-center gap-2 text-sm text-gray-500">
        <x-filament::loading-indicator class="h-5 w-5" />
        <span>Memuat direktori pengguna…</span>
    </div>

    {{ $this->table }}

    @if ($crmWarning)
        <x-filament::section icon="heroicon-o-exclamation-triangle" icon-color="warning" compact>
            <p class="text-sm">{{ $crmWarning }} Data Publisher tetap ditampilkan.</p>
        </x-filament::section>
    @endif
</x-filament-panels::page>
