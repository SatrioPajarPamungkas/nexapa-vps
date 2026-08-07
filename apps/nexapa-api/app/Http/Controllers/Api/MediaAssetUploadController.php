<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UploadMediaAssetRequest;
use App\Http\Resources\MediaAssetResource;
use App\Services\PublisherMediaUploadService;
use Illuminate\Http\JsonResponse;

class MediaAssetUploadController extends Controller
{
    public function upload(UploadMediaAssetRequest $request, PublisherMediaUploadService $uploadService): JsonResponse
    {
        try {
            $mediaAsset = $uploadService->store($request->user(), $request->file('file'));

            return (new MediaAssetResource($mediaAsset))
                ->response()
                ->setStatusCode(201);
        } catch (\Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'The media upload could not be saved.',
                'error' => 'media_upload_failed',
                'correlation_id' => $request->header('X-Request-ID'),
            ], 500);
        }
    }
}
