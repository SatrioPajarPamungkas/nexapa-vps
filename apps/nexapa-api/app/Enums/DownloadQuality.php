<?php

namespace App\Enums;

enum DownloadQuality: string
{
    case Best = 'best';
    case P1080 = '1080p';
    case P720 = '720p';
    case P480 = '480p';
}
