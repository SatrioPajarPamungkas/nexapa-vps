<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const NEW_LIMITS = [
        'starter' => 1,
        'pro' => 3,
        'business' => 5,
    ];

    private const OLD_LIMITS = [
        'starter' => 1,
        'pro' => 1,
        'business' => 3,
    ];

    public function up(): void
    {
        $this->applyLimits(self::NEW_LIMITS, true);
    }

    public function down(): void
    {
        $this->applyLimits(self::OLD_LIMITS, false);
    }

    private function applyLimits(
        array $wabaLimits,
        bool $addReplacementLimit,
    ): void {
        if (! Schema::hasTable('subscription_plans')) {
            return;
        }

        foreach ($wabaLimits as $planCode => $wabaLimit) {
            $plan = DB::table('subscription_plans')
                ->where('code', $planCode)
                ->first(['id', 'limits']);

            if ($plan === null) {
                continue;
            }

            $limits = $this->decodeLimits($plan->limits);
            $limits['whatsapp_numbers'] = $wabaLimit;

            if ($addReplacementLimit) {
                $limits['waba_accounts'] = $wabaLimit;
                $limits['waba_replacements_per_period'] = 3;
            } else {
                unset(
                    $limits['waba_accounts'],
                    $limits['waba_replacements_per_period'],
                );
            }

            DB::table('subscription_plans')
                ->where('id', $plan->id)
                ->update([
                    'limits' => json_encode(
                        $limits,
                        JSON_THROW_ON_ERROR,
                    ),
                    'updated_at' => now(),
                ]);

            if (! Schema::hasTable('subscriptions')) {
                continue;
            }

            DB::table('subscriptions')
                ->where('subscription_plan_id', $plan->id)
                ->orderBy('id')
                ->eachById(function ($subscription) use (
                    $wabaLimit,
                    $addReplacementLimit,
                ): void {
                    $snapshot = $this->decodeLimits(
                        $subscription->limits_snapshot,
                    );

                    $snapshot['whatsapp_numbers'] = $wabaLimit;

                    if ($addReplacementLimit) {
                        $snapshot['waba_accounts'] = $wabaLimit;
                        $snapshot['waba_replacements_per_period'] = 3;
                    } else {
                        unset(
                            $snapshot['waba_accounts'],
                            $snapshot['waba_replacements_per_period'],
                        );
                    }

                    DB::table('subscriptions')
                        ->where('id', $subscription->id)
                        ->update([
                            'limits_snapshot' => json_encode(
                                $snapshot,
                                JSON_THROW_ON_ERROR,
                            ),
                            'updated_at' => now(),
                        ]);
                }, 'id');
        }
    }

    private function decodeLimits(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        $decoded = json_decode((string) $value, true);

        return is_array($decoded) ? $decoded : [];
    }
};
