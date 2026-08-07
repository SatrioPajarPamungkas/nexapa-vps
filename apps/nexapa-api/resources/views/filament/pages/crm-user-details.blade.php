<x-filament-panels::page>
    @if ($crmErrorMessage)
        <x-filament::section icon="heroicon-o-exclamation-triangle" icon-color="warning">
            <x-slot name="heading">Data CRM sedang tidak tersedia</x-slot>
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ $crmErrorMessage }}</p>
        </x-filament::section>
    @else
        {{ $this->userInfolist }}
    @endif
</x-filament-panels::page>
