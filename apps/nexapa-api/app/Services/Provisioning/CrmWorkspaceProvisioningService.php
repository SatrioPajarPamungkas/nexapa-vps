<?php

namespace App\Services\Provisioning;

use App\Models\CrmUserMapping;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class CrmWorkspaceProvisioningService
{
    public function __construct(
        private readonly CrmProvisioningService $crm
    ) {}

    public function ensureForUser(
        User $user
    ): CrmUserMapping {
        $existing = CrmUserMapping::query()
            ->where(
                'publisher_user_id',
                $user->getKey()
            )
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        $normalizedEmail = Str::lower(
            Str::trim((string) $user->email)
        );

        // Gunakan akun CRM lama apabila profile dengan
        // email yang sama sudah tersedia.
        $existingProfile =
            $this->crm->findProfileByEmail(
                $normalizedEmail
            );

        if ($existingProfile !== null) {
            return CrmUserMapping::query()
                ->updateOrCreate(
                    [
                        'publisher_user_id' =>
                            $user->getKey(),
                    ],
                    [
                        'crm_user_id' =>
                            $existingProfile['user_id'],
                        'crm_account_id' =>
                            $existingProfile['account_id'],
                        'crm_profile_id' =>
                            $existingProfile['profile_id'],
                        'provisioned_at' => now(),
                    ]
                );
        }

        $crmUserId = null;
        $crmAccountId = null;
        $crmProfileId = null;

        try {
            // Password ini tidak pernah diberikan kepada
            // pengguna. Login tetap melalui Laravel bridge.
            $authUser =
                $this->crm->createAuthUserWithPassword(
                    $normalizedEmail,
                    (string) $user->name,
                    true,
                    Str::password(48)
                );

            $crmUserId =
                (string) $authUser['user_id'];

            $account =
                $this->crm
                    ->findAccountByOwnerUserId(
                        $crmUserId
                    );

            if ($account === null) {
                $account =
                    $this->crm->createAccount(
                        $crmUserId,
                        trim((string) $user->name)
                            .' Workspace'
                    );
            }

            $crmAccountId =
                (string) $account['account_id'];

            $profile =
                $this->crm->findProfileByUserId(
                    $crmUserId
                );

            if ($profile === null) {
                $profile =
                    $this->crm->createProfile(
                        $crmUserId,
                        $crmAccountId,
                        (string) $user->name,
                        $normalizedEmail
                    );
            }

            $crmProfileId = isset(
                $profile['profile_id']
            )
                ? (string) $profile['profile_id']
                : null;

            $mapping = DB::transaction(
                function () use (
                    $user,
                    $crmUserId,
                    $crmAccountId,
                    $crmProfileId
                ): CrmUserMapping {
                    return CrmUserMapping::query()
                        ->updateOrCreate(
                            [
                                'publisher_user_id' =>
                                    $user->getKey(),
                            ],
                            [
                                'crm_user_id' =>
                                    $crmUserId,
                                'crm_account_id' =>
                                    $crmAccountId,
                                'crm_profile_id' =>
                                    $crmProfileId,
                                'provisioned_at' =>
                                    now(),
                            ]
                        );
                }
            );

            $this->crm->flushCache();

            return $mapping;
        } catch (Throwable $exception) {
            // Bersihkan hanya resource yang dibuat oleh
            // proses ini agar tidak meninggalkan akun yatim.
            if ($crmProfileId !== null) {
                try {
                    $this->crm->deleteProfile(
                        $crmProfileId
                    );
                } catch (Throwable) {
                }
            }

            if ($crmAccountId !== null) {
                try {
                    $this->crm->deleteAccount(
                        $crmAccountId
                    );
                } catch (Throwable) {
                }
            }

            if ($crmUserId !== null) {
                try {
                    $this->crm->deleteAuthUser(
                        $crmUserId
                    );
                } catch (Throwable) {
                }
            }

            throw $exception;
        }
    }
}
