<?php

namespace App\Filament\Pages;

use App\Exceptions\UserProvisioningException;
use App\Filament\Resources\UserResource;
use App\Models\User;
use App\Services\AdminCredentialVaultService;
use App\Services\AdminPasswordService;
use App\Services\UnifiedUserDirectoryService;
use Filament\Actions\Action;
use Filament\Forms\Components\TextInput;
use Filament\Infolists;
use Filament\Infolists\Infolist;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Illuminate\Support\Carbon;
use Throwable;

class UnifiedUserDetails extends Page
{
    protected static bool $shouldRegisterNavigation = false;

    protected static ?string $slug = 'all-users/{record}';

    protected static string $view = 'filament.pages.unified-user-details';

    public ?User $publisher = null;

    public array $crm = [];

    public ?string $crmError = null;

    public ?string $vaultPassword = null;

    public ?string $passwordUpdatedAt = null;

    public static function canAccess(): bool
    {
        return auth()->user()?->isAdmin() === true;
    }

    public function mount(string $record): void
    {
        $detail = app(UnifiedUserDirectoryService::class)->detailFromKey($record);
        $this->publisher = $detail['publisher'];
        $this->crm = $detail['crm']?->toArray() ?? [];
        $this->crmError = $detail['crmError'];

        $email = $this->email();
        if ($email !== null) {
            try {
                $vault = app(AdminCredentialVaultService::class);
                $credential = $vault->find($email);
                $this->vaultPassword = $vault->reveal($email, auth()->id());
                $this->passwordUpdatedAt = $credential?->password_updated_at?->format('d M Y H:i');
            } catch (Throwable $exception) {
                report($exception);
                $this->vaultPassword = null;
                $this->passwordUpdatedAt = null;
            }
        }
    }

    public function getTitle(): string
    {
        return 'Pengguna: '.($this->publisher?->name ?? $this->crm['name'] ?? 'Tidak ditemukan');
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('changePassword')
                ->label('Ganti Password')
                ->icon('heroicon-o-key')
                ->color('warning')
                ->form([
                    TextInput::make('new_password')
                        ->label('Password Baru')
                        ->password()
                        ->revealable()
                        ->required()
                        ->minLength(8)
                        ->maxLength(128),
                    TextInput::make('new_password_confirmation')
                        ->label('Konfirmasi Password Baru')
                        ->password()
                        ->revealable()
                        ->required()
                        ->same('new_password'),
                ])
                ->action(function (array $data): void {
                    $email = $this->email();
                    if ($email === null) {
                        Notification::make()->danger()->title('Email pengguna tidak ditemukan')->send();

                        return;
                    }

                    try {
                        app(AdminPasswordService::class)->reset(
                            $email,
                            $this->publisher,
                            isset($this->crm['id']) ? (string) $this->crm['id'] : null,
                            $data['new_password'],
                            auth()->id(),
                        );

                        $this->vaultPassword = $data['new_password'];
                        $this->passwordUpdatedAt = now()->format('d M Y H:i');
                        Notification::make()->success()->title('Password berhasil diperbarui')->send();
                    } catch (UserProvisioningException $e) {
                        Notification::make()->danger()->title('Gagal memperbarui password')->body($e->getMessage())->send();
                    }
                }),
            Action::make('back')->label('Kembali')->icon('heroicon-o-arrow-left')->url(AllUsers::getUrl()),
        ];
    }

    public function identityInfolist(Infolist $infolist): Infolist
    {
        return $infolist->state([
            'name' => $this->publisher?->name ?? $this->crm['name'] ?? null,
            'email' => $this->publisher?->email ?? $this->crm['email'] ?? null,
            'publisher_id' => $this->publisher?->getKey(),
            'crm_id' => $this->crm['id'] ?? null,
            'product' => match (true) {
                $this->publisher !== null && $this->crm !== [] => 'Publisher + CRM',
                $this->publisher !== null => 'Publisher',
                default => 'CRM',
            },
            'email_verified' => match (true) {
                $this->publisher?->email_verified_at !== null => true,
                $this->crm['email_confirmed_at'] ?? null !== null => true,
                default => false,
            },
            'vault_password' => $this->vaultPassword,
            'password_updated_at' => $this->passwordUpdatedAt,
        ])->schema([
            Infolists\Components\Section::make('Ringkasan')
                ->schema([
                    Infolists\Components\TextEntry::make('name')->label('Nama'),
                    Infolists\Components\TextEntry::make('email')->label('Email')->copyable(),
                    Infolists\Components\TextEntry::make('product')->label('Produk')->badge(),
                    Infolists\Components\TextEntry::make('email_verified')
                        ->label('Verifikasi Email')
                        ->formatStateUsing(fn (bool $state): string => $state ? 'Terverifikasi' : 'Belum terverifikasi')
                        ->badge()
                        ->color(fn (bool $state): string => $state ? 'success' : 'warning'),
                    Infolists\Components\TextEntry::make('publisher_id')->label('ID Publisher')->copyable()->placeholder('Tidak ada'),
                    Infolists\Components\TextEntry::make('crm_id')->label('ID CRM')->copyable()->placeholder('Tidak ada'),
                ])->columns(['default' => 1, 'md' => 3])->columnSpanFull(),
            Infolists\Components\Section::make('Credential Vault')
                ->description('Password disimpan terenkripsi dan hanya dapat dilihat oleh Super Admin.')
                ->schema([
                    Infolists\Components\TextEntry::make('vault_password')
                        ->label('Password')
                        ->copyable()
                        ->copyMessage('Password disalin')
                        ->placeholder('Belum tersimpan — gunakan Ganti Password'),
                    Infolists\Components\TextEntry::make('password_updated_at')
                        ->label('Terakhir diperbarui')
                        ->placeholder('Belum tersedia'),
                ])->columns(['default' => 1, 'md' => 2])->columnSpanFull(),
        ]);
    }

    public function publisherInfolist(Infolist $infolist): Infolist
    {
        return $infolist->record($this->publisher)->schema([
            Infolists\Components\Section::make('Akun Publisher')
                ->schema([
                    Infolists\Components\TextEntry::make('name')->label('Nama'),
                    Infolists\Components\TextEntry::make('email')->label('Email'),
                    Infolists\Components\TextEntry::make('email_verified_at')
                        ->label('Verifikasi Email')
                        ->dateTime('d M Y H:i')
                        ->placeholder('Belum terverifikasi')
                        ->formatStateUsing(fn ($state): string => $state ? 'Terverifikasi pada '.$state->format('d M Y H:i') : 'Belum terverifikasi')
                        ->badge()
                        ->color(fn ($state): string => $state ? 'success' : 'warning'),
                    Infolists\Components\TextEntry::make('created_at')
                        ->label('Terdaftar')
                        ->dateTime('d M Y H:i'),
                    Infolists\Components\TextEntry::make('role')
                        ->label('Role')
                        ->formatStateUsing(fn (?string $state): string => $state ? str($state)->title()->toString() : 'User'),
                    Infolists\Components\TextEntry::make('is_admin')
                        ->label('Status Admin')
                        ->formatStateUsing(fn (bool $state): string => $state ? 'Admin' : 'User')
                        ->badge()
                        ->color(fn (bool $state): string => $state ? 'success' : 'gray'),
                ])->columns(['default' => 1, 'md' => 2])->columnSpanFull(),
        ]);
    }

    public function crmInfolist(Infolist $infolist): Infolist
    {
        return $infolist->state($this->crm)->schema([
            Infolists\Components\Section::make('Akun CRM')
                ->schema([
                    Infolists\Components\TextEntry::make('name')->label('Nama'),
                    Infolists\Components\TextEntry::make('email')->label('Email'),
                    Infolists\Components\TextEntry::make('account_name')->label('Workspace')->placeholder('Belum terhubung'),
                    Infolists\Components\TextEntry::make('account_role')->label('Role')->badge()->placeholder('Belum tersedia'),
                    Infolists\Components\TextEntry::make('email_confirmed_at')
                        ->label('Verifikasi Email')
                        ->placeholder('Belum terverifikasi')
                        ->formatStateUsing(fn ($state): string => $state ? 'Terverifikasi pada '.Carbon::parse($state)->format('d M Y H:i') : 'Belum terverifikasi')
                        ->badge()
                        ->color(fn ($state): string => $state ? 'success' : 'warning'),
                    Infolists\Components\TextEntry::make('created_at')
                        ->label('Terdaftar')
                        ->dateTime('d M Y H:i'),
                    Infolists\Components\TextEntry::make('last_sign_in_at')
                        ->label('Login Terakhir')
                        ->dateTime('d M Y H:i')
                        ->placeholder('Belum ada'),
                ])->columns(['default' => 1, 'md' => 3])->columnSpanFull(),
        ]);
    }

    public function publisherUrl(): ?string
    {
        return $this->publisher ? UserResource::getUrl('view', ['record' => $this->publisher]) : null;
    }

    public function crmUrl(): ?string
    {
        return isset($this->crm['id']) ? CrmUserDetails::getUrl(['record' => $this->crm['id']]) : null;
    }

    private function email(): ?string
    {
        $email = $this->publisher?->email ?? $this->crm['email'] ?? null;

        return is_string($email) && $email !== '' ? strtolower(trim($email)) : null;
    }
}
