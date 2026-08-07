<?php

namespace App\Http\Requests;

use App\Models\ConnectedAccount;
use App\Models\MediaAsset;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class StorePublisherPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $isFacebook = $this->input('platform') === 'facebook';
        $facebookPostType = $this->input('post_type');

        return [
            'platform' => ['required', Rule::in(['facebook', 'tiktok'])],
            'connected_account_id' => ['required', 'uuid'],
            'media_asset_id' => [
                Rule::requiredIf(! $isFacebook || in_array($facebookPostType, ['image', 'video'], true)),
                'nullable',
                'uuid',
            ],
            'post_type' => [Rule::requiredIf($isFacebook), 'nullable', Rule::in(['text', 'image', 'video'])],
            'caption' => [Rule::requiredIf($isFacebook && $facebookPostType === 'text'), 'nullable', 'string', 'max:5000'],
            'platform_settings' => [Rule::requiredIf($isFacebook), 'nullable', 'array'],
            'platform_settings.post_type' => [Rule::requiredIf($isFacebook), 'nullable', Rule::in(['text', 'image', 'video'])],
            'action' => ['required', Rule::in(['draft', 'publish_now', 'schedule'])],
            'provider_mode' => ['nullable', Rule::in(['direct_post', 'upload_as_draft'])],
            'privacy_level' => ['nullable', 'string'],
            'disable_comment' => ['nullable', 'boolean'],
            'disable_duet' => ['nullable', 'boolean'],
            'disable_stitch' => ['nullable', 'boolean'],
            'brand_content_toggle' => ['nullable', 'boolean'],
            'brand_organic_toggle' => ['nullable', 'boolean'],
            'scheduled_at' => [
                Rule::requiredIf($this->input('action') === 'schedule'),
                'nullable',
                'date',
                Rule::when($this->input('action') === 'schedule', ['after:now']),
            ],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($this->input('platform') !== 'facebook') {
                return;
            }

            $connectedAccount = ConnectedAccount::withTrashed()
                ->where('user_id', $this->user()->id)
                ->find($this->input('connected_account_id'));

            if (! $connectedAccount
                || $connectedAccount->trashed()
                || $connectedAccount->platform !== 'facebook'
                || ! $connectedAccount->isFacebookPage()
                || $connectedAccount->status !== 'connected'
                || ! $connectedAccount->is_publishable) {
                $validator->errors()->add('connected_account_id', 'Select a connected, publishable Facebook Page.');
            }

            if ($this->input('post_type') !== $this->input('platform_settings.post_type')) {
                $validator->errors()->add('platform_settings.post_type', 'Facebook post type settings must match the post type.');
            }

            if ($this->input('post_type') === 'text' && trim((string) $this->input('caption')) === '') {
                $validator->errors()->add('caption', 'The Facebook message must not be empty.');
            }

            if (in_array($this->input('post_type'), ['image', 'video'], true)) {
                $media = MediaAsset::where('user_id', $this->user()->id)->find($this->input('media_asset_id'));
                if (! $media || $media->media_type !== $this->input('post_type')) {
                    $validator->errors()->add('media_asset_id', 'Select exactly one '.$this->input('post_type').' media file.');
                }
            }
        }];
    }

    protected function failedValidation(Validator $validator): void
    {
        $errors = $validator->errors();
        $facebookPageInvalid = $this->input('platform') === 'facebook' && $errors->has('connected_account_id');

        throw new HttpResponseException(response()->json([
            'success' => false,
            'code' => $facebookPageInvalid ? 'facebook_page_required' : 'validation_error',
            'message' => $errors->first(),
            'errors' => $errors->toArray(),
        ], 422));
    }
}
