<?php

namespace App\Enums;

enum DownloadOutputFormat: string
{
    case Original = 'original';
    case Mp4 = 'mp4';
    case Audio = 'audio';
}
