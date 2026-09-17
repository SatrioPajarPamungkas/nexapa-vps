<?php

namespace App\Console\Commands;

use App\Models\CrmUserMapping;
use App\Models\User;
use App\Services\Crm\CrmUserDirectoryService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Throwable;

class ReconcileCrmIdentities extends Command
{
    protected $signature =
        'crm:reconcile-identities
        {--apply : Simpan mapping dan identitas pusat}';

    protected $description =
        'Rekonsiliasi akun CRM dengan identitas pusat tanpa menghapus data';

    public function __construct(
        private readonly CrmUserDirectoryService $directory,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $crmUsers = $this->loadCrmUsers();

        $mappings = CrmUserMapping::query()->get();

        $mappingByCrmId = $mappings->keyBy(
            fn (CrmUserMapping $mapping): string =>
                Str::lower($mapping->crm_user_id),
        );

        $mappingByCentralId = $mappings->keyBy(
            fn (CrmUserMapping $mapping): int =>
                (int) $mapping->publisher_user_id,
        );

        $centralByEmail = User::withTrashed()
            ->get()
            ->keyBy(
                fn (User $user): string =>
                    Str::lower(trim($user->email)),
            );

        $seenEmails = [];

        $stats = [
            'crm_total' => $crmUsers->count(),
            'already_mapped' => 0,
            'linked_by_email' => 0,
            'central_created' => 0,
            'would_link_by_email' => 0,
            'would_create_central' => 0,
            'soft_deleted_preserved' => 0,
            'conflicts' => 0,
        ];

        foreach ($crmUsers as $crm) {
            $crmId = Str::lower(trim($crm->id));
            $email = Str::lower(trim($crm->email));

            if (
                ! Str::isUuid($crmId) ||
                ! filter_var($email, FILTER_VALIDATE_EMAIL)
            ) {
                $stats['conflicts']++;

                continue;
            }

            if (
                isset($seenEmails[$email]) &&
                $seenEmails[$email] !== $crmId
            ) {
                $stats['conflicts']++;

                continue;
            }

            $seenEmails[$email] = $crmId;

            $existingMapping =
                $mappingByCrmId->get($crmId);

            if ($existingMapping !== null) {
                $central = User::withTrashed()->find(
                    $existingMapping->publisher_user_id,
                );

                if ($central === null) {
                    $stats['conflicts']++;

                    continue;
                }

                if ($central->trashed()) {
                    $stats['soft_deleted_preserved']++;

                    continue;
                }

                $stats['already_mapped']++;

                continue;
            }

            $central = $centralByEmail->get($email);

            if ($central !== null) {
                if ($central->trashed()) {
                    $stats['soft_deleted_preserved']++;

                    continue;
                }

                $otherMapping = $mappingByCentralId->get(
                    (int) $central->getKey(),
                );

                if (
                    $otherMapping !== null &&
                    Str::lower($otherMapping->crm_user_id)
                        !== $crmId
                ) {
                    $stats['conflicts']++;

                    continue;
                }

                if (! $apply) {
                    $stats['would_link_by_email']++;

                    continue;
                }

                DB::transaction(function () use (
                    $central,
                    $crm,
                    $crmId,
                ): void {
                    $central->forceFill([
                        'crm_access_status' => 'active',
                        'crm_suspended_at' => null,
                        'crm_suspension_reason' => null,
                    ])->save();

                    CrmUserMapping::query()->updateOrCreate(
                        ['publisher_user_id' => $central->getKey()],
                        [
                            'crm_user_id' => $crmId,
                            'crm_account_id' => $crm->accountId,
                            'crm_profile_id' => null,
                            'provisioned_at' => now(),
                        ],
                    );
                });

                $stats['linked_by_email']++;

                continue;
            }

            if (! $apply) {
                $stats['would_create_central']++;

                continue;
            }

            try {
                $central = DB::transaction(
                    function () use (
                        $crm,
                        $crmId,
                        $email,
                    ): User {
                        $verifiedAt = null;

                        if ($crm->emailConfirmedAt !== null) {
                            try {
                                $verifiedAt = Carbon::parse(
                                    $crm->emailConfirmedAt,
                                );
                            } catch (Throwable) {
                                $verifiedAt = null;
                            }
                        }

                        $central = User::query()->create([
                            'name' =>
                                trim($crm->name) !== ''
                                    ? trim($crm->name)
                                    : 'User CRM',
                            'email' => $email,
                            'password' => Hash::make(
                                Str::password(64),
                            ),
                            'role' => 'user',
                            'is_admin' => false,
                            'email_verified_at' => $verifiedAt,
                            'publisher_access_status' =>
                                'not_provisioned',
                            'crm_access_status' => 'active',
                            'commerce_access_status' =>
                                'not_provisioned',
                        ]);

                        CrmUserMapping::query()->create([
                            'publisher_user_id' =>
                                $central->getKey(),
                            'crm_user_id' => $crmId,
                            'crm_account_id' =>
                                $crm->accountId,
                            'crm_profile_id' => null,
                            'provisioned_at' => now(),
                        ]);

                        return $central;
                    },
                );

                $centralByEmail->put($email, $central);
                $stats['central_created']++;
            } catch (Throwable $exception) {
                report($exception);
                $stats['conflicts']++;
            }
        }

        $this->newLine();
        $this->info(
            $apply
                ? 'HASIL REKONSILIASI'
                : 'DRY RUN — TIDAK ADA DATA DIUBAH',
        );

        $this->table(
            ['Kategori', 'Jumlah'],
            collect($stats)
                ->map(
                    fn (int $value, string $key): array =>
                        [$key, $value],
                )
                ->values()
                ->all(),
        );

        if (! $apply) {
            $this->newLine();
            $this->comment(
                'Gunakan --apply hanya setelah hasil dry-run diperiksa.',
            );
        }

        return self::SUCCESS;
    }

    private function loadCrmUsers()
    {
        $page = 1;
        $users = collect();

        do {
            $result = $this->directory->listUsers(
                page: $page,
                perPage: 100,
            );

            $batch = collect($result['users']);
            $users = $users->concat($batch);
            $total = (int) $result['total'];
            $page++;
        } while (
            $batch->isNotEmpty() &&
            $users->count() < $total
        );

        return $users
            ->unique(fn ($crm): string => $crm->id)
            ->values();
    }
}
