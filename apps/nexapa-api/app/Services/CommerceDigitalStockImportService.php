<?php

namespace App\Services;

use App\Models\CommerceDigitalImportBatch;
use App\Models\CommerceDigitalStockItem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class CommerceDigitalStockImportService
{
    private const MAX_ROWS = 20000;

    public function preview(UploadedFile $file): array
    {
        $parsed = $this->parse($file);
        $existing = $this->existingFingerprints(
            array_column($parsed['rows'], 'fingerprint'),
        );

        $seen = [];
        $duplicates = 0;

        foreach ($parsed['rows'] as $row) {
            if (
                isset($seen[$row['fingerprint']]) ||
                isset($existing[$row['fingerprint']])
            ) {
                $duplicates++;
            }

            $seen[$row['fingerprint']] = true;
        }

        return [
            'headers' => $parsed['headers'],
            'total_rows' => $parsed['total_rows'],
            'valid_rows' =>
                count($parsed['rows']) - $duplicates,
            'duplicate_rows' => $duplicates,
            'invalid_rows' => $parsed['invalid_rows'],
            'sample' => array_map(
                fn (array $row): array => [
                    'row_number' => $row['row_number'],
                    'masked_identifier' =>
                        $row['masked_identifier'],
                ],
                array_slice($parsed['rows'], 0, 10),
            ),
        ];
    }

    public function import(
        UploadedFile $file,
        string $productId,
        ?string $variantId,
        int $userId,
    ): CommerceDigitalImportBatch {
        $parsed = $this->parse($file);
        $existing = $this->existingFingerprints(
            array_column($parsed['rows'], 'fingerprint'),
        );

        return DB::transaction(function () use (
            $file,
            $productId,
            $variantId,
            $userId,
            $parsed,
            $existing,
        ): CommerceDigitalImportBatch {
            $queue = CommerceDigitalStockItem::query()
                ->where('commerce_product_id', $productId)
                ->when(
                    $variantId,
                    fn ($query) => $query->where(
                        'commerce_product_variant_id',
                        $variantId,
                    ),
                    fn ($query) => $query->whereNull(
                        'commerce_product_variant_id',
                    ),
                )
                ->lockForUpdate()
                ->max('sort_order');

            $batch = CommerceDigitalImportBatch::query()->create([
                'commerce_product_id' => $productId,
                'commerce_product_variant_id' => $variantId,
                'original_name' => $file->getClientOriginalName(),
                'headers' => $parsed['headers'],
                'total_rows' => $parsed['total_rows'],
                'imported_rows' => 0,
                'duplicate_rows' => 0,
                'invalid_rows' => $parsed['invalid_rows'],
                'created_by' => $userId,
            ]);

            $position = (int) $queue;
            $imported = 0;
            $duplicates = 0;
            $seen = [];

            foreach ($parsed['rows'] as $row) {
                if (
                    isset($seen[$row['fingerprint']]) ||
                    isset($existing[$row['fingerprint']])
                ) {
                    $duplicates++;
                    continue;
                }

                $seen[$row['fingerprint']] = true;
                $position++;

                CommerceDigitalStockItem::query()->create([
                    'commerce_product_id' => $productId,
                    'commerce_product_variant_id' => $variantId,
                    'import_batch_id' => $batch->id,
                    'masked_identifier' =>
                        $row['masked_identifier'],
                    'payload' => $row['payload'],
                    'fingerprint' => $row['fingerprint'],
                    'status' =>
                        CommerceDigitalStockItem::STATUS_AVAILABLE,
                    'sort_order' => $position,
                    'created_by' => $userId,
                ]);

                $imported++;
            }

            $batch->update([
                'imported_rows' => $imported,
                'duplicate_rows' => $duplicates,
            ]);

            return $batch->fresh([
                'product:id,name',
                'variant:id,name,sku',
            ]);
        });
    }

    private function parse(UploadedFile $file): array
    {
        $handle = fopen($file->getRealPath(), 'rb');

        if (! $handle) {
            throw new RuntimeException('File CSV tidak dapat dibaca.');
        }

        try {
            $firstLine = fgets($handle);

            if ($firstLine === false) {
                throw new RuntimeException('File CSV kosong.');
            }

            $delimiter = $this->detectDelimiter($firstLine);
            rewind($handle);

            $rawHeaders = fgetcsv(
                $handle,
                0,
                $delimiter,
                '"',
                '\\',
            );

            if (! is_array($rawHeaders) || ! count($rawHeaders)) {
                throw new RuntimeException(
                    'Header CSV tidak ditemukan.',
                );
            }

            $headers = $this->normalizeHeaders($rawHeaders);
            $rows = [];
            $invalid = 0;
            $total = 0;
            $rowNumber = 1;

            while (
                ($values = fgetcsv(
                    $handle,
                    0,
                    $delimiter,
                    '"',
                    '\\',
                )) !== false
            ) {
                $rowNumber++;

                if ($total >= self::MAX_ROWS) {
                    throw new RuntimeException(
                        'Maksimal 20.000 baris per impor.',
                    );
                }

                if ($this->isEmptyRow($values)) {
                    continue;
                }

                $total++;

                if (count($values) !== count($headers)) {
                    $invalid++;
                    continue;
                }

                $payload = [];

                foreach ($headers as $index => $header) {
                    $payload[$header] = trim(
                        (string) ($values[$index] ?? ''),
                    );
                }

                if ($this->isEmptyRow(array_values($payload))) {
                    $invalid++;
                    continue;
                }

                $normalized = json_encode(
                    $payload,
                    JSON_UNESCAPED_UNICODE |
                    JSON_UNESCAPED_SLASHES,
                );

                $rows[] = [
                    'row_number' => $rowNumber,
                    'payload' => $payload,
                    'fingerprint' => hash_hmac(
                        'sha256',
                        mb_strtolower($normalized),
                        (string) config('app.key'),
                    ),
                    'masked_identifier' =>
                        $this->maskedIdentifier($payload),
                ];
            }

            return [
                'headers' => $headers,
                'rows' => $rows,
                'total_rows' => $total,
                'invalid_rows' => $invalid,
            ];
        } finally {
            fclose($handle);
        }
    }

    private function detectDelimiter(string $line): string
    {
        $delimiters = [',', ';', "\t", '|'];
        $selected = ',';
        $highest = 0;

        foreach ($delimiters as $delimiter) {
            $count = count(str_getcsv($line, $delimiter));

            if ($count > $highest) {
                $highest = $count;
                $selected = $delimiter;
            }
        }

        return $selected;
    }

    private function normalizeHeaders(array $headers): array
    {
        $result = [];
        $used = [];

        foreach ($headers as $index => $header) {
            $header = preg_replace(
                '/^\xEF\xBB\xBF/',
                '',
                trim((string) $header),
            );
            $base = Str::snake($header) ?: 'column_'.($index + 1);
            $name = $base;
            $suffix = 2;

            while (isset($used[$name])) {
                $name = $base.'_'.$suffix;
                $suffix++;
            }

            $used[$name] = true;
            $result[] = $name;
        }

        return $result;
    }

    private function isEmptyRow(array $values): bool
    {
        foreach ($values as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function maskedIdentifier(array $payload): string
    {
        $value = '';

        foreach (
            ['email', 'username', 'login', 'uid', 'id'] as $key
        ) {
            if (! empty($payload[$key])) {
                $value = (string) $payload[$key];
                break;
            }
        }

        if ($value === '') {
            $value = (string) (reset($payload) ?: 'stok');
        }

        if (filter_var($value, FILTER_VALIDATE_EMAIL)) {
            [$name, $domain] = explode('@', $value, 2);

            return mb_substr($name, 0, 2).'***@'.$domain;
        }

        if (mb_strlen($value) <= 5) {
            return mb_substr($value, 0, 1).'***';
        }

        return mb_substr($value, 0, 3)
            .'***'
            .mb_substr($value, -2);
    }

    private function existingFingerprints(array $fingerprints): array
    {
        $existing = [];

        foreach (array_chunk(array_unique($fingerprints), 500) as $chunk) {
            foreach (
                CommerceDigitalStockItem::query()
                    ->whereIn('fingerprint', $chunk)
                    ->pluck('fingerprint') as $fingerprint
            ) {
                $existing[$fingerprint] = true;
            }
        }

        return $existing;
    }
}
