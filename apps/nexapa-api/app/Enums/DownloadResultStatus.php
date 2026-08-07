<?php

namespace App\Enums;

enum DownloadResultStatus: string
{
    case Discovered = 'discovered';
    case Selected = 'selected';
    case Queued = 'queued';
    case Processed = 'processed';
    case Failed = 'failed';
    case Skipped = 'skipped';
}
