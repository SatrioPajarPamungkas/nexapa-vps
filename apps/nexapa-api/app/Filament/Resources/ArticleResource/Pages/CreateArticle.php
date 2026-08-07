<?php

namespace App\Filament\Resources\ArticleResource\Pages;

use App\Filament\Resources\ArticleResource;
use Filament\Resources\Pages\CreateRecord;

class CreateArticle extends CreateRecord
{
    protected static string $resource =
        ArticleResource::class;

    protected function mutateFormDataBeforeCreate(
        array $data
    ): array {
        $data['created_by'] = auth()->id();
        $data['updated_by'] = auth()->id();

        return $data;
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl(
            'edit',
            [
                'record' => $this->record,
            ]
        );
    }
}
