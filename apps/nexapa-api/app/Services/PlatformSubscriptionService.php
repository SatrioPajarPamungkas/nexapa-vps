<?php

namespace App\Services;

use App\Models\CrmAccount;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PlatformSubscriptionService
{
    public function activatePublisher(
        User $user,
        string $planCode,
        string $billingCycle,
        User $actor,
    ): Subscription {
        return $this->activate(
            product: 'publisher',
            email: $user->email,
            planCode: $planCode,
            billingCycle: $billingCycle,
            actor: $actor,
            publisherUserId: (int) $user->getKey(),
        );
    }

    public function activateCrm(
        CrmAccount $account,
        string $planCode,
        string $billingCycle,
        User $actor,
    ): Subscription {
        return $this->activate(
            product: 'crm',
            email: $account->email,
            planCode: $planCode,
            billingCycle: $billingCycle,
            actor: $actor,
            crmUserId: $account->crm_user_id,
            crmAccountId: $account->crm_account_id,
        );
    }

    private function activate(
        string $product,
        string $email,
        string $planCode,
        string $billingCycle,
        User $actor,
        ?int $publisherUserId = null,
        ?string $crmUserId = null,
        ?string $crmAccountId = null,
    ): Subscription {
        $plan = SubscriptionPlan::query()
            ->where('code', $planCode)
            ->where('is_active', true)
            ->first();

        if ($plan === null) {
            throw ValidationException::withMessages([
                'plan_code' => 'Paket tidak tersedia.',
            ]);
        }

        if (! in_array($billingCycle, ['monthly', 'yearly'], true)) {
            throw ValidationException::withMessages([
                'billing_cycle' => 'Periode paket tidak valid.',
            ]);
        }

        $startsAt = now();
        $expiresAt = $billingCycle === 'yearly'
            ? $startsAt->copy()->addYear()
            : $startsAt->copy()->addMonthNoOverflow();
        $usageEndsAt = $startsAt->copy()->addMonthNoOverflow();

        if ($usageEndsAt->greaterThan($expiresAt)) {
            $usageEndsAt = $expiresAt->copy();
        }

        return DB::transaction(function () use (
            $product,
            $email,
            $plan,
            $billingCycle,
            $actor,
            $publisherUserId,
            $crmUserId,
            $crmAccountId,
            $startsAt,
            $expiresAt,
            $usageEndsAt,
        ): Subscription {
            Subscription::query()
                ->where('product', $product)
                ->when(
                    $product === 'publisher',
                    fn ($query) => $query->where(
                        'publisher_user_id',
                        $publisherUserId,
                    ),
                    fn ($query) => $query->where(
                        'crm_user_id',
                        $crmUserId,
                    ),
                )
                ->where('status', 'active')
                ->update([
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                    'updated_at' => now(),
                ]);

            $subscription = Subscription::query()->create([
                'subscription_plan_id' => $plan->getKey(),
                'email' => strtolower(trim($email)),
                'product' => $product,
                'publisher_user_id' => $publisherUserId,
                'crm_user_id' => $crmUserId,
                'crm_account_id' => $crmAccountId,
                'plan_code' => $plan->code,
                'plan_name' => $plan->name,
                'billing_cycle' => $billingCycle,
                'price_paid' => $plan->priceFor($billingCycle),
                'limits_snapshot' => $plan->limits,
                'status' => 'active',
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
                'created_by' => $actor->getKey(),
            ]);

            $subscription->usages()->create([
                'period_starts_at' => $startsAt,
                'period_ends_at' => $usageEndsAt,
                'ai_requests' => 0,
                'broadcasts_sent' => 0,
                'scheduled_posts' => 0,
            ]);

            return $subscription;
        });
    }
}
