<?php

namespace App\Http\Controllers;

use App\Data\Provisioning\ProvisioningInput;
use App\Exceptions\UserProvisioningException;
use App\Services\Provisioning\UnifiedUserProvisioningService;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\View\View;
use Throwable;

class AdminUserProvisioningController extends Controller
{
    public function create(): View|RedirectResponse
    {
        if (! auth()->check()) {
            return redirect('/admin/login');
        }

        abort_unless(auth()->user()->isAdmin(), 403);

        return view('admin.users.create');
    }

    public function store(
        Request $request,
        UnifiedUserProvisioningService $service,
        SubscriptionService $subscriptions,
    ): RedirectResponse {
        if (! auth()->check()) {
            return redirect('/admin/login');
        }

        abort_unless(auth()->user()->isAdmin(), 403);

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'min:2', 'max:255'],
            'email' => ['required', 'email', 'max:255'],

            'plan_code' => [
                'required',
                Rule::in(['starter', 'pro', 'business']),
            ],

            'billing_cycle' => [
                'required',
                Rule::in(['monthly', 'yearly']),
            ],

            'crm_workspace_name' => [
                'required',
                'string',
                'min:2',
                'max:255',
            ],

            'temporary_password' => [
                'required',
                'string',
                'min:8',
                'max:128',
                'confirmed',
            ],

            'publisher_role' => [
                'nullable',
                Rule::in(['user', 'admin']),
            ],

            'email_verified' => ['nullable', 'boolean'],
        ]);

        try {
            $input = new ProvisioningInput(
                fullName: $validated['full_name'],
                email: $validated['email'],
                product: 'both',
                deliveryMethod: 'temporary_password',
                temporaryPassword: $validated['temporary_password'],
                emailVerified: $request->boolean('email_verified'),
                crmWorkspaceName: $validated['crm_workspace_name'] ?? null,
                publisherRole: $validated['publisher_role'] ?? 'user',
                adminActorId: (string) auth()->id(),
            );

            $result = $service->provision($input);

            if (! $result->fullSuccess) {
                return back()
                    ->withInput($request->except([
                        'temporary_password',
                        'temporary_password_confirmation',
                    ]))
                    ->withErrors([
                        'provisioning' => $result->errors[0]
                            ?? 'Pembuatan akun gagal.',
                    ]);
            }

            $subscription =
                $subscriptions->activateForProvisionedUser(
                    result: $result,
                    email: $validated['email'],
                    planCode: $validated['plan_code'],
                    billingCycle: $validated['billing_cycle'],
                    createdBy: (int) auth()->id(),
                );

            return redirect()
                ->route('admin.user-provisioning.create')
                ->with(
                    'success',
                    'Akun '.implode(
                        ' + ',
                        $result->getCreatedProducts(),
                    ).' berhasil dibuat. Paket '
                    .$subscription->plan_name
                    .' aktif sampai '
                    .$subscription->expires_at->format('d M Y H:i')
                    .'.'
                )
                ->with(
                    'created_password',
                    $result->temporaryPassword
                );
        } catch (UserProvisioningException $e) {
            return back()
                ->withInput($request->except([
                    'temporary_password',
                    'temporary_password_confirmation',
                ]))
                ->withErrors([
                    'provisioning' => $e->getMessage(),
                ]);
        } catch (Throwable $e) {
            Log::error('Admin user provisioning failed.', [
                'exception' => $e,
                'admin_id' => auth()->id(),
            ]);

            return back()
                ->withInput($request->except([
                    'temporary_password',
                    'temporary_password_confirmation',
                ]))
                ->withErrors([
                    'provisioning' =>
                        'Terjadi kesalahan internal. Periksa log server.',
                ]);
        }
    }
}
