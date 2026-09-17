<?php

namespace App\Console\Commands;

use App\Models\CommerceProduct;
use Illuminate\Console\Command;

class ExpireUnsoldCommerceProducts extends Command
{
    protected $signature = 'commerce:expire-unsold-products';

    protected $description =
        'Warn and expire active Commerce products with no sales';

    public function handle(): int
    {
        $initialized = 0;

        CommerceProduct::query()
            ->where('status', CommerceProduct::STATUS_ACTIVE)
            ->where('sold_count', 0)
            ->whereNull('expires_at')
            ->chunkById(100, function ($products) use (&$initialized): void {
                foreach ($products as $product) {
                    $startsAt = $product->published_at
                        ?? $product->created_at
                        ?? now();

                    $product->forceFill([
                        'expires_at' => $startsAt->copy()->addDays(30),
                        'expiration_warning_sent_at' => null,
                    ])->save();

                    $initialized++;
                }
            });

        $warned = CommerceProduct::query()
            ->where('status', CommerceProduct::STATUS_ACTIVE)
            ->where('sold_count', 0)
            ->whereNull('first_sold_at')
            ->whereNull('expiration_warning_sent_at')
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', now())
            ->where('expires_at', '<=', now()->addDay())
            ->update([
                'expiration_warning_sent_at' => now(),
                'updated_at' => now(),
            ]);

        $expired = CommerceProduct::query()
            ->where('status', CommerceProduct::STATUS_ACTIVE)
            ->where('sold_count', 0)
            ->whereNull('first_sold_at')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->update([
                'status' => CommerceProduct::STATUS_ARCHIVED,
                'published_at' => null,
                'expired_at' => now(),
                'updated_at' => now(),
            ]);

        $this->components->info(
            "Initialized {$initialized}; warned {$warned}; expired {$expired}."
        );

        return self::SUCCESS;
    }
}
