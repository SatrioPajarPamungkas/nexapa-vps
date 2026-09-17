<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmAccount;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class InternalCrmEntitlementController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $configuredKey = (string) config(
            'services.nexapa_internal.entitlement_key'
        );

        $providedKey = (string) $request->header(
            'X-Nexapa-Entitlement-Key'
        );

        if (
            $configuredKey === '' ||
            $providedKey === '' ||
            ! hash_equals($configuredKey, $providedKey)
        ) {
            return response()->json([
                'allowed' => false,
                'whatsapp_enabled' => false,
                'code' => 'unauthorized_internal_request',
            ], Response::HTTP_UNAUTHORIZED);
        }

        $validated = $request->validate([
            'crm_user_id' => [
                'required',
                'uuid',
            ],
        ]);

        $crmUserId = $validated['crm_user_id'];

        if (
            $crmUserId === (string) config(
                'services.nexapa_internal.owner_crm_user_id'
            )
        ) {
            return response()->json([
                'allowed' => true,
                'whatsapp_enabled' => true,
                'admin_bypass' => true,
                'status' => 'active',
                'plan' => 'owner',
            ]);
        }

        $account = CrmAccount::query()
            ->where('crm_user_id', $crmUserId)
            ->first();

        if ($account === null) {
            return response()->json([
                'allowed' => false,
                'whatsapp_enabled' => false,
                'code' => 'crm_account_missing',
                'status' => 'invalid',
                'message' =>
                    'Akun CRM tidak ditemukan.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (
            $account->access_status !== 'active'
        ) {
            return response()->json([
                'allowed' => false,
                'whatsapp_enabled' => false,
                'code' => 'crm_access_'.$account->access_status,
                'status' => $account->access_status,
                'message' =>
                    'Akun sedang dinonaktifkan.',
            ], Response::HTTP_FORBIDDEN);
        }

        $subscription = Subscription::query()
            ->where('product', 'crm')
            ->where('crm_user_id', $crmUserId)
            ->latest('id')
            ->first();

        if ($subscription === null) {
            return response()->json([
                // CRM dasar tetap boleh digunakan.
                'allowed' => true,
                // Hanya fitur WhatsApp yang dikunci.
                'whatsapp_enabled' => false,
                'code' => 'subscription_missing',
                'status' => 'missing',
                'plan' => null,
                'crm_account_id' =>
                    $account->crm_account_id,
                'message' =>
                    'Pilih paket untuk mengaktifkan WhatsApp API.',
            ]);
        }

        if (
            $subscription->status === 'active' &&
            $subscription->expires_at?->isPast()
        ) {
            $subscription->forceFill([
                'status' => 'expired',
            ])->save();
        }

        $limits = is_array($subscription->limits_snapshot)
            ? $subscription->limits_snapshot
            : [];

        $wabaLimit = max(
            0,
            (int) (
                $limits['waba_accounts']
                ?? $limits['whatsapp_numbers']
                ?? 0
            ),
        );

        $replacementLimit = max(
            0,
            (int) (
                $limits['waba_replacements_per_period']
                ?? 3
            ),
        );

        $replacementPeriod =
            $this->wabaReplacementPeriod($subscription);

        $whatsappEnabled =
            $subscription->isActive();

        return response()->json([
            // Dashboard CRM selalu terbuka.
            'allowed' => true,
            'whatsapp_enabled' =>
                $whatsappEnabled,
            'code' => $whatsappEnabled
                ? 'subscription_active'
                : 'subscription_'.$subscription->status,
            'status' => $subscription->status,
            'plan' => $subscription->plan_code,
            'plan_name' =>
                $subscription->plan_name,
            'billing_cycle' =>
                $subscription->billing_cycle,
            'crm_account_id' =>
                $account->crm_account_id,
            'expires_at' =>
                $subscription->expires_at
                    ?->toIso8601String(),
            'waba_limit' => $wabaLimit,
            'waba_replacement_limit' =>
                $replacementLimit,
            'waba_replacement_period' => [
                'starts_at' =>
                    $replacementPeriod['starts_at']
                        ->toIso8601String(),
                'ends_at' =>
                    $replacementPeriod['ends_at']
                        ->toIso8601String(),
            ],
            'limits' => $limits,
        ]);
    }

    private function wabaReplacementPeriod(
        Subscription $subscription,
    ): array {
        $startsAt = $subscription->starts_at
            ?->copy()
            ?? now();

        $expiresAt = $subscription->expires_at
            ?->copy();

        $periodStart = $startsAt->copy();
        $periodEnd = $periodStart
            ->copy()
            ->addMonthNoOverflow();

        while (
            $periodEnd->isPast()
            && (
                $expiresAt === null
                || $periodEnd->lessThan($expiresAt)
            )
        ) {
            $periodStart = $periodEnd->copy();
            $periodEnd = $periodStart
                ->copy()
                ->addMonthNoOverflow();
        }

        if (
            $expiresAt !== null
            && $periodEnd->greaterThan($expiresAt)
        ) {
            $periodEnd = $expiresAt->copy();
        }

        return [
            'starts_at' => $periodStart,
            'ends_at' => $periodEnd,
        ];
    }

}
