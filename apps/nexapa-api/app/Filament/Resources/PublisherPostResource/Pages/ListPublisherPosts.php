<?php

namespace App\Filament\Resources\PublisherPostResource\Pages;

use App\Filament\Resources\PublisherPostResource;
use Filament\Resources\Pages\ListRecords;

class ListPublisherPosts extends ListRecords
{
    protected static string $resource = PublisherPostResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}