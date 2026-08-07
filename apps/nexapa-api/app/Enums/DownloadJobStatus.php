<?php

namespace App\Enums;

enum DownloadJobStatus: string
{
    case Queued = 'queued';
    case Analyzing = 'analyzing';
    case AwaitingSelection = 'awaiting_selection';
    case Ready = 'ready';
    case Claimed = 'claimed';
    case Processing = 'processing';
    case Completed = 'completed';
    case PartiallyCompleted = 'partially_completed';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case Skipped = 'skipped';

    public function label(): string
    {
        return match ($this) {
            self::Queued => 'Queued',
            self::Analyzing => 'Analyzing',
            self::AwaitingSelection => 'Awaiting Selection',
            self::Ready => 'Ready',
            self::Claimed => 'Claimed',
            self::Processing => 'Processing',
            self::Completed => 'Completed',
            self::PartiallyCompleted => 'Partially Completed',
            self::Failed => 'Failed',
            self::Cancelled => 'Cancelled',
            self::Skipped => 'Skipped',
        };
    }

    public function isActive(): bool
    {
        return in_array($this, [
            self::Queued,
            self::Analyzing,
            self::AwaitingSelection,
            self::Ready,
            self::Claimed,
            self::Processing,
        ]);
    }

    public function isTerminal(): bool
    {
        return in_array($this, [
            self::Completed,
            self::Failed,
            self::Cancelled,
            self::Skipped,
        ], true);
    }

    /**
     * @return list<string>
     */
    public static function terminalValues(): array
    {
        return array_map(
            static fn (self $status): string => $status->value,
            array_filter(self::cases(), static fn (self $status): bool => $status->isTerminal()),
        );
    }
}
