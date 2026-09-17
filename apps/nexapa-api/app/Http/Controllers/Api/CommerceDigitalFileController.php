<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Commerce\IndexCommerceDigitalFileRequest;
use App\Http\Requests\Commerce\StoreCommerceDigitalFileRequest;
use App\Http\Resources\CommerceDigitalFileResource;
use App\Models\CommerceDigitalFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class CommerceDigitalFileController extends Controller
{
    public function index(
        IndexCommerceDigitalFileRequest $request,
    ): AnonymousResourceCollection {
        $validated = $request->validated();

        $query = CommerceDigitalFile::query()
            ->with([
                'product:id,name',
                'variant:id,name,sku',
            ])
            ->orderBy('commerce_product_id')
            ->orderBy('sort_order')
            ->latest('created_at');

        if (! empty($validated['search'])) {
            $search = $validated['search'];

            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('label', 'like', "%{$search}%")
                    ->orWhere('original_name', 'like', "%{$search}%")
                    ->orWhereHas(
                        'product',
                        fn ($product) => $product->where(
                            'name',
                            'like',
                            "%{$search}%",
                        ),
                    )
                    ->orWhereHas(
                        'variant',
                        fn ($variant) => $variant->where(
                            'name',
                            'like',
                            "%{$search}%",
                        )->orWhere('sku', 'like', "%{$search}%"),
                    );
            });
        }

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['product_id'])) {
            $query->where(
                'commerce_product_id',
                $validated['product_id'],
            );
        }

        $summary = CommerceDigitalFile::query()
            ->selectRaw('COUNT(*) as total')
            ->selectRaw(
                "SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as ready",
                [CommerceDigitalFile::STATUS_READY],
            )
            ->selectRaw(
                "SUM(CASE WHEN status IN (?, ?, ?) THEN 1 ELSE 0 END) as sold",
                [
                    CommerceDigitalFile::STATUS_SOLD,
                    CommerceDigitalFile::STATUS_DELIVERED,
                    CommerceDigitalFile::STATUS_DOWNLOADED,
                ],
            )
            ->selectRaw(
                "SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as downloaded",
                [CommerceDigitalFile::STATUS_DOWNLOADED],
            )
            ->first();

        return CommerceDigitalFileResource::collection(
            $query->paginate((int) ($validated['per_page'] ?? 50)),
        )->additional([
            'success' => true,
            'message' => 'Digital files retrieved.',
            'summary' => [
                'total' => (int) ($summary->total ?? 0),
                'ready' => (int) ($summary->ready ?? 0),
                'sold' => (int) ($summary->sold ?? 0),
                'downloaded' => (int) ($summary->downloaded ?? 0),
            ],
        ]);
    }

    public function store(
        StoreCommerceDigitalFileRequest $request,
    ): JsonResponse {
        $validated = $request->validated();
        $uploadedFile = $request->file('file');
        $productId = $validated['commerce_product_id'];
        $variantId = $validated['commerce_product_variant_id'] ?? null;

        $extension = strtolower(
            $uploadedFile->guessExtension()
                ?: $uploadedFile->getClientOriginalExtension()
                ?: 'bin',
        );
        $extension = preg_replace('/[^a-z0-9]+/', '', $extension) ?: 'bin';
        $storedName = Str::uuid().'.'.$extension;
        $directory = "commerce/digital-files/{$productId}";
        $storedPath = null;

        try {
            $digitalFile = DB::transaction(function () use (
                $request,
                $uploadedFile,
                $validated,
                $productId,
                $variantId,
                $directory,
                $storedName,
                &$storedPath,
            ): CommerceDigitalFile {
                $queue = CommerceDigitalFile::query()
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

                $storedPath = Storage::disk('local')->putFileAs(
                    $directory,
                    $uploadedFile,
                    $storedName,
                );

                if (! $storedPath) {
                    throw new RuntimeException(
                        'File gagal disimpan ke storage private.',
                    );
                }

                return CommerceDigitalFile::query()->create([
                    'commerce_product_id' => $productId,
                    'commerce_product_variant_id' => $variantId,
                    'label' => $validated['label']
                        ?: pathinfo(
                            $uploadedFile->getClientOriginalName(),
                            PATHINFO_FILENAME,
                        ),
                    'disk' => 'local',
                    'path' => $storedPath,
                    'original_name' =>
                        $uploadedFile->getClientOriginalName(),
                    'mime_type' => $uploadedFile->getMimeType(),
                    'size_bytes' => $uploadedFile->getSize(),
                    'checksum_sha256' => hash_file(
                        'sha256',
                        $uploadedFile->getRealPath(),
                    ),
                    'status' => CommerceDigitalFile::STATUS_READY,
                    'sort_order' => ((int) $queue) + 1,
                    'created_by' => $request->user()->getKey(),
                ]);
            });
        } catch (Throwable $exception) {
            if ($storedPath) {
                Storage::disk('local')->delete($storedPath);
            }

            throw $exception;
        }

        $digitalFile->load([
            'product:id,name',
            'variant:id,name,sku',
        ]);

        return (new CommerceDigitalFileResource($digitalFile))
            ->additional([
                'success' => true,
                'message' => 'File digital berhasil diunggah.',
            ])
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(
        CommerceDigitalFile $digitalFile,
    ): JsonResponse {
        if (! in_array(
            $digitalFile->status,
            [
                CommerceDigitalFile::STATUS_READY,
                CommerceDigitalFile::STATUS_DISABLED,
            ],
            true,
        )) {
            return response()->json([
                'success' => false,
                'message' =>
                    'File yang sudah terjual tidak dapat dihapus.',
            ], 409);
        }

        Storage::disk($digitalFile->disk)->delete($digitalFile->path);
        $digitalFile->delete();

        return response()->json([
            'success' => true,
            'message' => 'File digital dihapus.',
        ]);
    }
}
