<?php

namespace App\Filament\Resources\UserActivityLogResource\Pages;

use App\Filament\Resources\UserActivityLogResource;
use Filament\Resources\Pages\ListRecords;

class ListUserActivityLogs extends ListRecords
{
    protected static string $resource = UserActivityLogResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
