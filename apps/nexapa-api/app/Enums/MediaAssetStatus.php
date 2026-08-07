<?php

namespace App\Enums;

enum MediaAssetStatus: string
{
    case Pending = 'pending';
    case Available = 'available';
    case Unavailable = 'unavailable';
    case Archived = 'archived';
}
