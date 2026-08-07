<x-filament-panels::page>
    {{ $this->identityInfolist }}

    @if ($publisher)
        {{ $this->publisherInfolist }}
        <x-filament::button tag="a" :href="$this->publisherUrl()" icon="heroicon-o-arrow-top-right-on-square">
            Lihat detail Publisher
        </x-filament::button>
    @endif

    @if ($crm !== [])
        {{ $this->crmInfolist }}
        <x-filament::button tag="a" :href="$this->crmUrl()" icon="heroicon-o-arrow-top-right-on-square" color="info">
            Lihat detail CRM
        </x-filament::button>
    @elseif ($crmError)
        <x-filament::section icon="heroicon-o-exclamation-triangle" icon-color="warning">
            <x-slot name="heading">Data CRM sedang tidak tersedia</x-slot>
            <p class="text-sm">{{ $crmError }}</p>
        </x-filament::section>
    @endif
</x-filament-panels::page>
