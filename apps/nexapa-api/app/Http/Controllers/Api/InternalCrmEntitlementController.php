<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CrmUserMapping;
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

        $mapping = CrmUserMapping::query()
            ->with('publisherUser')
            ->where('crm_user_id', $crmUserId)
            ->first();

        if ($mapping === null) {
            return response()->json([
                'allowed' => false,
                'whatsapp_enabled' => false,
                'code' => 'crm_mapping_missing',
                'status' => 'invalid',
                'message' =>
                    'Pemetaan akun CRM tidak ditemukan.',
            ], Response::HTTP_FORBIDDEN);
        }

        if (
            $mapping->publisherUser === null ||
            (bool) (
                $mapping->publisherUser->is_suspended
                ?? false
            )
        ) {
            return response()->json([
                'allowed' => false,
                'whatsapp_enabled' => false,
                'code' => 'account_suspended',
                'status' => 'suspended',
                'message' =>
                    'Akun sedang dinonaktifkan.',
            ], Response::HTTP_FORBIDDEN);
        }

        $subscription = Subscription::query()
            ->where(
                'publisher_user_id',
                $mapping->publisher_user_id
            )
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
                    $mapping->crm_account_id,
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
                $mapping->crm_account_id,
            'expires_at' =>
                $subscription->expires_at
                    ?->toIso8601String(),
            'limits' =>
                $subscription->limits_snapshot,
        ]);
    }
}
