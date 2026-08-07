<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BatchScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'platform' => ['required', Rule::in(['facebook', 'tiktok'])],
            'connected_account_id' => ['required_without:connected_account_ids', 'string', 'exists:connected_accounts,id'],
            'connected_account_ids' => ['required_without:connected_account_id', 'array', 'min:1', 'max:10'],
            'connected_account_ids.*' => ['required', 'string', 'distinct', 'exists:connected_accounts,id'],
            'timezone' => ['required', 'string', 'timezone'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.media_asset_id' => ['required', 'string', 'exists:media_assets,id'],
            'items.*.caption' => ['nullable', 'string', 'max:5000'],
            'items.*.scheduled_at' => ['required', 'date'],
            'items.*.post_type' => ['required', Rule::in(['video'])],
            'items.*.platform_settings' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'platform.required' => 'Platform is required.',
            'platform.in' => 'Invalid platform. Only facebook and tiktok are supported.',
            'connected_account_id.required' => 'Destination account is required.',
            'connected_account_id.exists' => 'Selected account does not exist.',
            'connected_account_ids.required_without' => 'At least one destination account is required.',
            'connected_account_ids.min' => 'At least one destination account is required.',
            'connected_account_ids.max' => 'Maximum 10 Facebook Pages allowed per batch.',
            'connected_account_ids.*.distinct' => 'Duplicate destination accounts are not allowed.',
            'connected_account_ids.*.exists' => 'One or more selected accounts do not exist.',
            'timezone.required' => 'Timezone is required.',
            'timezone.timezone' => 'Invalid timezone.',
            'items.required' => 'At least one item is required.',
            'items.min' => 'At least one item is required.',
            'items.max' => 'Maximum 50 items allowed.',
            'items.*.media_asset_id.required' => 'Media asset is required for each item.',
            'items.*.media_asset_id.exists' => 'One or more media assets do not exist.',
            'items.*.scheduled_at.required' => 'Schedule time is required for each item.',
            'items.*.scheduled_at.date' => 'Invalid schedule time format.',
            'items.*.post_type.required' => 'Post type is required.',
            'items.*.post_type.in' => 'Only video post type is supported for bulk scheduling.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->items)) {
            $this->merge(['items' => json_decode($this->items, true) ?? []]);
        }

        if (is_array($this->items)) {
            $mediaAssetIds = array_column($this->items, 'media_asset_id');
            if (count($mediaAssetIds) !== count(array_unique($mediaAssetIds))) {
                $this->merge(['_has_duplicate_media' => true]);
            }
        }
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->filled('connected_account_ids') && $this->input('platform') !== 'facebook') {
                $validator->errors()->add('connected_account_ids', 'Multiple destination accounts are only supported for Facebook.');
            }

            if ($this->_has_duplicate_media ?? false) {
                $validator->errors()->add('items', 'Duplicate media_asset_id is not allowed within the same batch.');
            }

            if (is_array($this->items)) {
                foreach ($this->items as $index => $item) {
                    if (isset($item['scheduled_at'])) {
                        try {
                            $scheduledAt = \Carbon\Carbon::parse($item['scheduled_at'], $this->timezone);
                            $minScheduledAt = now()->addMinutes(5);

                            if ($scheduledAt->lt($minScheduledAt)) {
                                $validator->errors()->add("items.{$index}.scheduled_at", "Schedule time must be at least 5 minutes in the future.");
                            }
                        } catch (\Exception $e) {
                        }
                    }
                }
            }
        });
    }
}
