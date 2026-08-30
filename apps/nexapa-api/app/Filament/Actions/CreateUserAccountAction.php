<?php

namespace App\Filament\Actions;

use App\Data\Provisioning\ProvisioningInput;
use App\Exceptions\UserProvisioningException;
use App\Services\Provisioning\UnifiedUserProvisioningService;
use Filament\Actions\Action;
use Filament\Forms\Components\Checkbox;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Notifications\Notification;
use Illuminate\Support\Facades\Cache;

class CreateUserAccountAction
{
    private const LOCK_KEY_PREFIX = 'create_user_lock:';

    private const LOCK_TTL = 5;

    public static function make(): Action
    {
        return Action::make('createAccount')
            ->label('Buat Akun')
            ->icon('heroicon-o-user-plus')
            ->color('primary')
            ->form([
                        TextInput::make('full_name')
                            ->label('Nama Lengkap')
                            ->placeholder('Masukkan nama lengkap')
                            ->required()
                            ->maxLength(255)
                            ->minLength(2)
                            ->autocomplete('name'),

                        TextInput::make('email')
                            ->label('Email')
                            ->placeholder('nama@contoh.com')
                            ->email()
                            ->required()
                            ->maxLength(255)
                            ->autocomplete('email'),

                        Select::make('product')
                            ->label('Produk')
                            ->placeholder('Pilih produk')
                            ->options([
                                'publisher' => 'Publisher',
                                'crm' => 'CRM',
                                'both' => 'Publisher + CRM',
                            ])
                            ->default('publisher')
                            ->required()
                            ->live(),

                        TextInput::make('crm_workspace_name')
                            ->label('Nama Workspace CRM')
                            ->placeholder('Nama workspace/perusahaan')
                            ->maxLength(255)
                            ->minLength(2)
                            ->visible(fn (array $get): bool => in_array($get('product'), ['crm', 'both']))
                            ->required(fn (array $get): bool => in_array($get('product'), ['crm', 'both'])),

                        TextInput::make('temporary_password')
                            ->label('Password Akun')
                            ->placeholder('Minimal 8 karakter')
                            ->password()
                            ->revealable()
                            ->minLength(8)
                            ->maxLength(128)
                            ->helperText('Password yang sama dipakai untuk semua produk dan disimpan terenkripsi di vault admin.')
                            ->required(),

                        Select::make('publisher_role')
                            ->label('Role Publisher')
                            ->options([
                                'user' => 'User',
                                'admin' => 'Admin',
                            ])
                            ->default('user')
                            ->visible(fn (array $get): bool => in_array($get('product'), ['publisher', 'both'])),

                        Checkbox::make('email_verified')
                            ->label('Email sudah diverifikasi')
                            ->default(false),
                ])
            ->action(function (array $data): void {
                self::handleCreateAccount($data);
            })
            ->modalHeading('Buat Akun Baru')
            ->modalDescription('Buat akun Publisher, CRM, atau keduanya.')
            ->modalWidth('lg')
            ->modalSubmitActionLabel('Buat Akun')
            ->modalCancelActionLabel('Batal');
    }

    private static function handleCreateAccount(array $data): void
    {
        if (! auth()->check() || ! auth()->user()->isAdmin()) {
            Notification::make()
                ->danger()
                ->title('Tidak terotorisasi')
                ->body('Hanya admin yang dapat membuat akun.')
                ->send();

            return;
        }

        $lockKey = self::LOCK_KEY_PREFIX.auth()->id();
        if (! Cache::add($lockKey, true, self::LOCK_TTL)) {
            Notification::make()
                ->danger()
                ->title('Permintaan sedang diproses')
                ->body('Tunggu beberapa detik sebelum mencoba lagi.')
                ->send();

            return;
        }

        try {
            $input = new ProvisioningInput(
                fullName: $data['full_name'],
                email: $data['email'],
                product: $data['product'],
                deliveryMethod: 'temporary_password',
                temporaryPassword: $data['temporary_password'],
                emailVerified: (bool) ($data['email_verified'] ?? false),
                crmWorkspaceName: $data['crm_workspace_name'] ?? null,
                publisherRole: $data['publisher_role'] ?? 'user',
                adminActorId: (string) auth()->id(),
            );

            $service = app(UnifiedUserProvisioningService::class);
            $result = $service->provision($input);

            if ($result->fullSuccess) {
                $products = implode(' + ', $result->getCreatedProducts());
                $message = "Akun {$products} berhasil dibuat.";

                if ($result->createdCrm() && ! empty($input->crmWorkspaceName)) {
                    $message .= " Workspace \"{$input->crmWorkspaceName}\" telah dibuat.";
                }

                Notification::make()
                    ->success()
                    ->title('Akun berhasil dibuat')
                    ->body($message.' Password akun: '.$result->temporaryPassword.'. Password tersimpan terenkripsi dan dapat dilihat kembali di detail pengguna.')
                    ->persistent()
                    ->send();
            } else {
                Notification::make()
                    ->danger()
                    ->title('Gagal membuat akun')
                    ->body($result->errors[0] ?? 'Terjadi kesalahan yang tidak diketahui.')
                    ->send();
            }
        } catch (UserProvisioningException $e) {
            Notification::make()
                ->danger()
                ->title('Gagal membuat akun')
                ->body($e->getMessage())
                ->send();
        } finally {
            Cache::forget($lockKey);
        }
    }
}
