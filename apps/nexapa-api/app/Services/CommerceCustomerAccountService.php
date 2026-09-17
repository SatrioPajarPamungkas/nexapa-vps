<?php

namespace App\Services;

use App\Models\CommerceCustomer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CommerceCustomerAccountService
{
    public function create(array $data, User $actor): CommerceCustomer
    {
        $customer = CommerceCustomer::query()->create([
            'name' => trim($data['name']),
            'email' => strtolower(trim($data['email'])),
            'password' => $data['password'],
            'email_verified_at' =>
                ($data['email_verified'] ?? true) ? now() : null,
            'access_status' => 'active',
            'registered_at' => now(),
        ]);

        $this->log('commerce.account_created', $customer, $actor);

        return $customer;
    }

    public function suspend(
        CommerceCustomer $target,
        ?string $reason,
        User $actor,
    ): CommerceCustomer {
        $target->forceFill([
            'access_status' => 'suspended',
            'suspended_at' => now(),
            'suspension_reason' =>
                filled($reason) ? trim($reason) : null,
            'remember_token' => null,
        ])->save();

        $this->log('commerce.access_suspended', $target, $actor, $reason);

        return $target->fresh();
    }

    public function activate(
        CommerceCustomer $target,
        User $actor,
    ): CommerceCustomer {
        $target->forceFill([
            'access_status' => 'active',
            'suspended_at' => null,
            'suspension_reason' => null,
        ])->save();

        $this->log('commerce.access_activated', $target, $actor);

        return $target->fresh();
    }

    public function archive(
        CommerceCustomer $target,
        ?string $reason,
        User $actor,
    ): CommerceCustomer {
        $target->forceFill([
            'access_status' => 'archived',
            'suspended_at' => now(),
            'suspension_reason' =>
                filled($reason) ? trim($reason) : null,
            'remember_token' => null,
        ])->save();

        $this->log('commerce.account_archived', $target, $actor, $reason);

        return $target->fresh();
    }

    public function forceDelete(
        CommerceCustomer $target,
        User $actor,
        string $emailConfirmation,
    ): void {
        if (strcasecmp(trim($emailConfirmation), $target->email) !== 0) {
            abort(422, 'Konfirmasi email tidak sesuai.');
        }

        $snapshot = clone $target;

        DB::transaction(function () use ($target): void {
            $target->orders()->delete();
            $target->forceDelete();
        });

        $this->log('commerce.account_purged', $snapshot, $actor);
    }

    private function log(
        string $event,
        CommerceCustomer $target,
        User $actor,
        ?string $reason = null,
    ): void {
        Log::info('Commerce customer lifecycle changed.', [
            'event' => $event,
            'actor_user_id' => $actor->getKey(),
            'commerce_customer_id' => $target->getKey(),
            'email_hash' => hash('sha256', strtolower($target->email)),
            'reason' => filled($reason) ? trim($reason) : null,
        ]);
    }
}
