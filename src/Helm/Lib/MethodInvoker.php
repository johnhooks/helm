<?php

declare(strict_types=1);

namespace Helm\Lib;

use Helm\lucatume\DI52\Container;
use ReflectionClass;
use ReflectionMethod;
use ReflectionNamedType;
use ReflectionParameter;

/**
 * Invokes methods and creates instances with auto-wired parameters from the container.
 *
 * Provides Laravel-like container->call() and make() functionality for DI52.
 */
final class MethodInvoker
{
    public function __construct(
        private readonly Container $container,
    ) {
    }

    /**
     * Create a class instance, resolving constructor parameters from the container.
     *
     * @template T of object
     * @param class-string<T> $class The class to instantiate
     * @param array<string, mixed> $parameters Explicit parameters to pass (by name)
     * @return T The created instance
     */
    public function make(string $class, array $parameters = []): object
    {
        $reflection = new ReflectionClass($class);
        $constructor = $reflection->getConstructor();

        if ($constructor === null) {
            return $reflection->newInstance();
        }

        $args = $this->resolveMethodParameters($constructor, $parameters);

        return $reflection->newInstanceArgs($args);
    }

    /**
     * Call a method on an object, resolving parameters from the container.
     *
     * @param object $instance The object instance
     * @param string $method The method name to call
     * @param array<string, mixed> $parameters Explicit parameters to pass (by name)
     * @return mixed The method's return value
     */
    public function call(object $instance, string $method, array $parameters = []): mixed
    {
        $reflection = new ReflectionMethod($instance, $method);
        $args = $this->resolveMethodParameters($reflection, $parameters);

        return $reflection->invokeArgs($instance, $args);
    }

    /**
     * Resolve all parameters for a method.
     *
     * @param array<string, mixed> $parameters
     * @return array<int, mixed>
     */
    private function resolveMethodParameters(ReflectionMethod $method, array $parameters): array
    {
        $args = [];

        foreach ($method->getParameters() as $param) {
            $args[] = $this->resolveParameter($param, $parameters, $method);
        }

        return $args;
    }

    /**
     * Resolve a single parameter.
     *
     * Priority:
     * 1. Explicit parameter passed by name
     * 2. Type-hinted class resolved from container
     * 3. Default value
     * 4. Throw exception
     *
     * @param array<string, mixed> $parameters
     */
    private function resolveParameter(
        ReflectionParameter $param,
        array $parameters,
        ReflectionMethod $method,
    ): mixed {
        $name = $param->getName();

        // 1. Check for explicit parameter by name
        if (array_key_exists($name, $parameters)) {
            return $parameters[$name];
        }

        // 2. Try to resolve from container if type-hinted
        $type = $param->getType();
        if ($type instanceof ReflectionNamedType && ! $type->isBuiltin()) {
            // If nullable with default, try container but fall back to default
            if ($type->allowsNull() && $param->isDefaultValueAvailable()) {
                try {
                    return $this->container->get($type->getName());
                } catch (\Throwable) {
                    return $param->getDefaultValue();
                }
            }

            return $this->container->get($type->getName());
        }

        // 3. Use default value if available
        if ($param->isDefaultValueAvailable()) {
            return $param->getDefaultValue();
        }

        // 4. Cannot resolve - throw
        throw new \RuntimeException(sprintf(
            'Cannot resolve parameter $%s for %s::%s()',
            $name,
            $method->getDeclaringClass()->getName(),
            $method->getName()
        ));
    }
}
