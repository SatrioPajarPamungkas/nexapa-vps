<?php

namespace App\Services\OAuth;

use RuntimeException;

class TikTokOAuthException extends RuntimeException
{
    private ?string $errorCode;
    private ?string $errorDescription;
    private ?string $logId;
    private ?int $httpStatus;
    private array $errorInfo;

    public function __construct(
        string $message,
        int $code,
        ?string $errorCode = null,
        ?string $errorDescription = null,
        ?string $logId = null,
        ?int $httpStatus = null,
        array $errorInfo = []
    ) {
        parent::__construct($message, $code);
        $this->errorCode = $errorCode;
        $this->errorDescription = $errorDescription;
        $this->logId = $logId;
        $this->httpStatus = $httpStatus;
        $this->errorInfo = $errorInfo;
    }

    public function getErrorCode(): ?string
    {
        return $this->errorCode;
    }

    public function getErrorDescription(): ?string
    {
        return $this->errorDescription;
    }

    public function getLogId(): ?string
    {
        return $this->logId;
    }

    public function getHttpStatus(): ?int
    {
        return $this->httpStatus;
    }

    public function getErrorInfo(): array
    {
        return $this->errorInfo;
    }
}