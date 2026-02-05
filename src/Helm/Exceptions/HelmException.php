<?php

declare(strict_types=1);

namespace Helm\Exceptions;

use Helm\Core\ErrorCode;
use RuntimeException;

/**
 * Base exception for all Helm errors.
 *
 * Provides structured error handling with error codes and WP_Error conversion.
 */
class HelmException extends RuntimeException
{
    public function __construct(
        public readonly ErrorCode $errorCode,
        string $message,
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }

    /**
     * Convert to WP_Error for REST API responses.
     *
     * Chains any previous HelmException errors.
     */
    public function toWpError(): \WP_Error
    {
        $error = $this->errorCode->error($this->getMessage());

        $previous = $this->getPrevious();
        while ($previous !== null) {
            if ($previous instanceof HelmException) {
                $error->add(
                    $previous->errorCode->code(),
                    $previous->getMessage()
                );
            }
            $previous = $previous->getPrevious();
        }

        return $error;
    }
}
