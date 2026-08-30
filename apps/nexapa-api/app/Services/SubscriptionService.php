<?php

namespace App\Services;

use App\Data\Provisioning\UserProvisioningResult;
use App\Models\Subscription;
use App\Models\CrmUserMapping;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubscriptionService
{
    public function activateForProvisionedUser(
        UserProvisioningResult $result,
        string $email,
        string $planCode,
        string $billingCycle,
        int $createdBy,
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

        if (! in_array(
            $billingCycle,
            ['monthly', 'yearly'],
            true,
        )) {
            throw ValidationException::withMessages([
                'billing_cycle' => 'Periode tidak valid.',
            ]);
        }

        if (! $result->publisherCreated || ! $result->crmCreated) {
            throw ValidationException::withMessages([
                'subscription' =>
                    'Langganan membutuhkan akun Publisher dan CRM.',
            ]);
        }

        $normalizedEmail = strtolower(trim($email));
        $startsAt = now();

        $expiresAt = $billingCycle === 'yearly'
            ? $startsAt->copy()->addYear()
            : $startsAt->copy()->addMonthNoOverflow();

        $usagePeriodEnd = $startsAt
            ->copy()
            ->addMonthNoOverflow();

        if ($usagePeriodEnd->greaterThan($expiresAt)) {
            $usagePeriodEnd = $expiresAt->copy();
        }

        return DB::transaction(function () use (
            $result,
            $normalizedEmail,
            $plan,
            $billingCycle,
            $createdBy,
            $startsAt,
            $expiresAt,
            $usagePeriodEnd,
        ): Subscription {
            Subscription::query()
                ->where('email', $normalizedEmail)
                ->where('status', 'active')
                ->update([
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                    'updated_at' => now(),
                ]);

            $subscription = Subscription::create([
                'subscription_plan_id' => $plan->getKey(),
                'email' => $normalizedEmail,
                'publisher_user_id' => $result->publisherUserId,
                'crm_user_id' => $result->crmUserId,
                'crm_account_id' => $result->crmAccountId,
                'plan_code' => $plan->code,
                'plan_name' => $plan->name,
                'billing_cycle' => $billingCycle,
                'price_paid' => $plan->priceFor($billingCycle),
                'limits_snapshot' => $plan->limits,
                'status' => 'active',
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
                'created_by' => $createdBy,
            ]);

            $subscription->usages()->create([
                'period_starts_at' => $startsAt,
                'period_ends_at' => $usagePeriodEnd,
                'ai_requests' => 0,
                'broadcasts_sent' => 0,
                'scheduled_posts' => 0,
            ]);

            (new AdminActivityLogger)->success(
                'subscription.activated',
                $subscription,
                'Langganan Nexapa diaktifkan.',
                [
                    'plan_code' => $plan->code,
                    'billing_cycle' => $billingCycle,
                    'price_paid' => $plan->priceFor(
                        $billingCycle
                    ),
                    'expires_at' => $expiresAt->toIso8601String(),
                    'publisher_user_id' =>
                        $result->publisherUserId,
                    'has_crm_user' =>
                        $result->crmUserId !== null,
                ]
            );

            return $subscription;
        });
    }

    public function updateForPublisherUser(
        int $publisherUserId,
        string $planCode,
        string $billingCycle,
        string $status,
        CarbonInterface $startsAt,
        CarbonInterface $expiresAt,
        int $adminUserId,
    ): Subscription {
        $plan = SubscriptionPlan::query()
            ->where('code', $planCode)
            ->where('is_active', true)
            ->first();

        if ($plan === null) {
            throw ValidationException::withMessages([
                'plan_code' =>
                    'Paket tidak tersedia.',
            ]);
        }

        if (! in_array(
            $billingCycle,
            ['monthly', 'yearly'],
            true,
        )) {
            throw ValidationException::withMessages([
                'billing_cycle' =>
                    'Periode paket tidak valid.',
            ]);
        }

        if (! in_array(
            $status,
            [
                'active',
                'expired',
                'suspended',
                'cancelled',
            ],
            true,
        )) {
            throw ValidationException::withMessages([
                'status' =>
                    'Status paket tidak valid.',
            ]);
        }

        if (
            $status === 'active' &&
            ! $expiresAt->greaterThan($startsAt)
        ) {
            throw ValidationException::withMessages([
                'expires_at' =>
                    'Tanggal berakhir harus setelah tanggal mulai.',
            ]);
        }

        $user = User::withTrashed()
            ->find($publisherUserId);

        if ($user === null) {
            throw ValidationException::withMessages([
                'subscription' =>
                    'Pengguna Publisher tidak ditemukan.',
            ]);
        }

        $mapping = CrmUserMapping::query()
            ->where(
                'publisher_user_id',
                $publisherUserId
            )
            ->first();

        if ($mapping === null) {
            throw ValidationException::withMessages([
                'subscription' =>
                    'Akun CRM pengguna belum tersedia.',
            ]);
        }

        return DB::transaction(function () use (
            $publisherUserId,
            $user,
            $mapping,
            $plan,
            $billingCycle,
            $status,
            $startsAt,
            $expiresAt,
            $adminUserId,
        ): Subscription {
            $subscription = Subscription::query()
                ->where(
                    'publisher_user_id',
                    $publisherUserId
                )
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if ($subscription === null) {
                $subscription = new Subscription([
                    'publisher_user_id' =>
                        $publisherUserId,
                    'email' =>
                        strtolower(trim($user->email)),
                    'crm_user_id' =>
                        $mapping->crm_user_id,
                    'crm_account_id' =>
                        $mapping->crm_account_id,
                    'created_by' =>
                        $adminUserId,
                ]);
            }

            $subscription->forceFill([
                'subscription_plan_id' =>
                    $plan->getKey(),
                'email' =>
                    strtolower(trim($user->email)),
                'publisher_user_id' =>
                    $publisherUserId,
                'crm_user_id' =>
                    $mapping->crm_user_id,
                'crm_account_id' =>
                    $mapping->crm_account_id,
                'plan_code' =>
                    $plan->code,
                'plan_name' =>
                    $plan->name,
                'billing_cycle' =>
                    $billingCycle,
                'price_paid' =>
                    $plan->priceFor($billingCycle),
                'limits_snapshot' =>
                    $plan->limits,
                'status' =>
                    $status,
                'starts_at' =>
                    $startsAt,
                'expires_at' =>
                    $expiresAt,
                'cancelled_at' =>
                    $status === 'cancelled'
                        ? now()
                        : null,
                'created_by' =>
                    $subscription->created_by
                        ?? $adminUserId,
            ]);

            $subscription->save();

            if ($status === 'active') {
                $usageEnd = $startsAt
                    ->copy()
                    ->addMonthNoOverflow();

                if (
                    $usageEnd->greaterThan(
                        $expiresAt
                    )
                ) {
                    $usageEnd =
                        $expiresAt->copy();
                }

                $subscription->usages()
                    ->firstOrCreate(
                        [
                            'period_starts_at' =>
                                $startsAt,
                        ],
                        [
                            'period_ends_at' =>
                                $usageEnd,
                            'ai_requests' => 0,
                            'broadcasts_sent' => 0,
                            'scheduled_posts' => 0,
                        ]
                    );
            }

            return $subscription->fresh();
        });
    }

}
