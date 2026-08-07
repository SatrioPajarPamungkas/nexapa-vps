<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ArticleResource\Pages;
use App\Models\Article;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Str;

class ArticleResource extends Resource
{
    protected static ?string $model = Article::class;

    protected static ?string $navigationIcon =
        'heroicon-o-newspaper';

    protected static ?string $navigationGroup =
        'Konten Website';

    protected static ?string $navigationLabel =
        'Artikel';

    protected static ?string $modelLabel =
        'Artikel';

    protected static ?string $pluralModelLabel =
        'Artikel';

    protected static ?string $recordTitleAttribute =
        'title';

    protected static ?int $navigationSort = 10;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make(
                    'Konten artikel'
                )
                    ->description(
                        'Tulis artikel seperti konten berita atau editorial.'
                    )
                    ->schema([
                        Forms\Components\TextInput::make(
                            'title'
                        )
                            ->label('Judul')
                            ->required()
                            ->maxLength(255)
                            ->live(onBlur: true)
                            ->afterStateUpdated(
                                function (
                                    Forms\Set $set,
                                    Forms\Get $get,
                                    ?string $state
                                ): void {
                                    if (blank($get('slug'))) {
                                        $set(
                                            'slug',
                                            Str::slug($state ?? '')
                                        );
                                    }
                                }
                            ),

                        Forms\Components\TextInput::make(
                            'slug'
                        )
                            ->label('Slug URL')
                            ->required()
                            ->maxLength(255)
                            ->unique(ignoreRecord: true)
                            ->regex(
                                '/^[a-z0-9]+(?:-[a-z0-9]+)*$/'
                            )
                            ->helperText(
                                'Contoh: strategi-digital-untuk-umkm'
                            ),

                        Forms\Components\Textarea::make(
                            'excerpt'
                        )
                            ->label('Ringkasan')
                            ->rows(4)
                            ->maxLength(500)
                            ->columnSpanFull()
                            ->helperText(
                                'Ringkasan singkat untuk kartu artikel dan hasil pencarian.'
                            ),

                        Forms\Components\RichEditor::make(
                            'content'
                        )
                            ->label('Isi artikel')
                            ->required()
                            ->columnSpanFull()
                            ->fileAttachmentsDisk('public')
                            ->fileAttachmentsDirectory(
                                'articles/content'
                            )
                            ->fileAttachmentsVisibility(
                                'public'
                            )
                            ->toolbarButtons([
                                'attachFiles',
                                'blockquote',
                                'bold',
                                'bulletList',
                                'codeBlock',
                                'h1',
                                'h2',
                                'h3',
                                'italic',
                                'link',
                                'orderedList',
                                'redo',
                                'strike',
                                'underline',
                                'undo',
                            ]),
                    ])
                    ->columns(2)
                    ->columnSpan(2),

                Forms\Components\Section::make(
                    'Publikasi'
                )
                    ->schema([
                        Forms\Components\FileUpload::make(
                            'featured_image'
                        )
                            ->label('Gambar utama')
                            ->image()
                            ->imageEditor()
                            ->disk('public')
                            ->directory(
                                'articles/featured'
                            )
                            ->visibility('public')
                            ->maxSize(5120)
                            ->acceptedFileTypes([
                                'image/jpeg',
                                'image/png',
                                'image/webp',
                            ])
                            ->helperText(
                                'JPG, PNG, atau WebP. Maksimal 5 MB.'
                            ),

                        Forms\Components\TextInput::make(
                            'category'
                        )
                            ->label('Kategori')
                            ->required()
                            ->default('Berita')
                            ->maxLength(100)
                            ->datalist([
                                'Berita',
                                'Bisnis',
                                'Teknologi',
                                'Produk',
                                'Panduan',
                                'Insight',
                                'Perusahaan',
                            ]),

                        Forms\Components\TextInput::make(
                            'author_name'
                        )
                            ->label('Nama penulis')
                            ->required()
                            ->default('Redaksi Nexapa')
                            ->maxLength(150),

                        Forms\Components\Select::make(
                            'status'
                        )
                            ->label('Status')
                            ->options(
                                Article::statusOptions()
                            )
                            ->default(
                                Article::STATUS_DRAFT
                            )
                            ->required()
                            ->native(false)
                            ->live(),

                        Forms\Components\DateTimePicker::make(
                            'published_at'
                        )
                            ->label('Tanggal publikasi')
                            ->native(false)
                            ->seconds(false)
                            ->timezone('Asia/Jakarta')
                            ->locale('id')
                            ->displayFormat(
                                'd F Y H:i'
                            )
                            ->required(
                                fn (
                                    Forms\Get $get
                                ): bool =>
                                    $get('status')
                                    === Article::STATUS_SCHEDULED
                            )
                            ->visible(
                                fn (
                                    Forms\Get $get
                                ): bool =>
                                    in_array(
                                        $get('status'),
                                        [
                                            Article::STATUS_PUBLISHED,
                                            Article::STATUS_SCHEDULED,
                                        ],
                                        true
                                    )
                            )
                            ->helperText(
                                fn (
                                    Forms\Get $get
                                ): string =>
                                    $get('status')
                                    === Article::STATUS_SCHEDULED
                                        ? 'Artikel tampil otomatis ketika waktunya tiba.'
                                        : 'Kosongkan untuk menerbitkan sekarang.'
                            ),

                        Forms\Components\Toggle::make(
                            'is_featured'
                        )
                            ->label('Artikel unggulan')
                            ->helperText(
                                'Artikel dapat ditampilkan pada bagian utama website.'
                            ),
                    ])
                    ->columnSpan(1),

                Forms\Components\Section::make(
                    'SEO'
                )
                    ->description(
                        'Opsional. Digunakan untuk judul dan deskripsi mesin pencari.'
                    )
                    ->schema([
                        Forms\Components\TextInput::make(
                            'meta_title'
                        )
                            ->label('Meta title')
                            ->maxLength(255)
                            ->helperText(
                                'Kosongkan untuk memakai judul artikel.'
                            ),

                        Forms\Components\Textarea::make(
                            'meta_description'
                        )
                            ->label('Meta description')
                            ->rows(3)
                            ->maxLength(160)
                            ->helperText(
                                'Disarankan maksimal 160 karakter.'
                            ),
                    ])
                    ->columns(2)
                    ->columnSpanFull(),
            ])
            ->columns(3);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make(
                    'featured_image'
                )
                    ->label('Gambar')
                    ->disk('public')
                    ->square(),

                Tables\Columns\TextColumn::make(
                    'title'
                )
                    ->label('Judul')
                    ->searchable()
                    ->sortable()
                    ->weight('medium')
                    ->wrap()
                    ->description(
                        fn (
                            Article $record
                        ): ?string =>
                            $record->excerpt
                                ? Str::limit(
                                    $record->excerpt,
                                    70
                                )
                                : null
                    ),

                Tables\Columns\TextColumn::make(
                    'category'
                )
                    ->label('Kategori')
                    ->badge()
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make(
                    'status'
                )
                    ->label('Status')
                    ->badge()
                    ->formatStateUsing(
                        function (
                            string $state,
                            Article $record
                        ): string {
                            if (
                                $record->isPubliclyVisible()
                            ) {
                                return 'Terbit';
                            }

                            return Article::statusOptions()[
                                $state
                            ] ?? ucfirst($state);
                        }
                    )
                    ->color(
                        function (
                            string $state,
                            Article $record
                        ): string {
                            if (
                                $record->isPubliclyVisible()
                            ) {
                                return 'success';
                            }

                            return match ($state) {
                                Article::STATUS_SCHEDULED =>
                                    'warning',
                                Article::STATUS_PUBLISHED =>
                                    'success',
                                default => 'gray',
                            };
                        }
                    )
                    ->sortable(),

                Tables\Columns\IconColumn::make(
                    'is_featured'
                )
                    ->label('Unggulan')
                    ->boolean(),

                Tables\Columns\TextColumn::make(
                    'published_at'
                )
                    ->label('Publikasi')
                    ->dateTime(
                        'd M Y H:i',
                        'Asia/Jakarta'
                    )
                    ->placeholder('Belum terbit')
                    ->sortable(),

                Tables\Columns\TextColumn::make(
                    'updated_at'
                )
                    ->label('Diperbarui')
                    ->since()
                    ->sortable()
                    ->toggleable(
                        isToggledHiddenByDefault: true
                    ),
            ])
            ->defaultSort(
                'updated_at',
                'desc'
            )
            ->filters([
                Tables\Filters\SelectFilter::make(
                    'status'
                )
                    ->label('Status')
                    ->options(
                        Article::statusOptions()
                    ),

                Tables\Filters\SelectFilter::make(
                    'category'
                )
                    ->label('Kategori')
                    ->options(
                        fn (): array =>
                            Article::query()
                                ->whereNotNull('category')
                                ->where(
                                    'category',
                                    '!=',
                                    ''
                                )
                                ->orderBy('category')
                                ->pluck(
                                    'category',
                                    'category'
                                )
                                ->all()
                    ),

                Tables\Filters\TernaryFilter::make(
                    'is_featured'
                )
                    ->label('Artikel unggulan'),

                Tables\Filters\TrashedFilter::make(),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),

                Tables\Actions\DeleteAction::make(),

                Tables\Actions\RestoreAction::make(),

                Tables\Actions\ForceDeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),

                    Tables\Actions\RestoreBulkAction::make(),

                    Tables\Actions\ForceDeleteBulkAction::make(),
                ]),
            ])
            ->emptyStateHeading(
                'Belum ada artikel'
            )
            ->emptyStateDescription(
                'Buat artikel pertama untuk website Nexapa.'
            )
            ->emptyStateIcon(
                'heroicon-o-newspaper'
            );
    }

    public static function getNavigationBadge(): ?string
    {
        $draftCount = Article::query()
            ->where(
                'status',
                Article::STATUS_DRAFT
            )
            ->count();

        return $draftCount > 0
            ? (string) $draftCount
            : null;
    }

    public static function getNavigationBadgeColor(): string
    {
        return 'warning';
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' =>
                Pages\ListArticles::route('/'),

            'create' =>
                Pages\CreateArticle::route('/create'),

            'edit' =>
                Pages\EditArticle::route(
                    '/{record}/edit'
                ),
        ];
    }
}
