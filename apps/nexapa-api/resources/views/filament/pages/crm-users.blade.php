<x-filament-panels::page>
    <div wire:loading.flex class="items-center gap-2 text-sm text-gray-500">
        <x-filament::loading-indicator class="h-5 w-5" />
        <span>Memuat data CRM…</span>
    </div>

    {{ $this->table }}
</x-filament-panels::page>
