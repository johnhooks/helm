<?php

declare(strict_types=1);

namespace Tests\Wpunit\Lib;

use Helm\Lib\MethodInvoker;
use Helm\lucatume\DI52\Container;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Lib\MethodInvoker
 */
class MethodInvokerTest extends WPTestCase
{
    private Container $container;
    private MethodInvoker $invoker;

    public function _before(): void
    {
        parent::_before();
        $this->container = new Container();
        $this->invoker = new MethodInvoker($this->container);
    }

    public function test_call_invokes_method_with_no_parameters(): void
    {
        $object = new class {
            public function greet(): string
            {
                return 'Hello';
            }
        };

        $result = $this->invoker->call($object, 'greet');

        $this->assertSame('Hello', $result);
    }

    public function test_call_resolves_type_hinted_dependency_from_container(): void
    {
        $dependency = new class {
            public function getValue(): string
            {
                return 'from-dependency';
            }
        };

        $dependencyClass = get_class($dependency);
        $this->container->singleton($dependencyClass, fn () => $dependency);

        $object = new class {
            /** @var object */
            public $receivedDependency;

            public function handle(object $dep): string
            {
                $this->receivedDependency = $dep;
                return $dep->getValue();
            }
        };

        // We need to create a class that type-hints the dependency
        $testClass = new class ($this->invoker, $this->container, $dependencyClass) {
            public function __construct(
                private MethodInvoker $invoker,
                private Container $container,
                private string $depClass,
            ) {
            }

            public function run(): string
            {
                $dep = $this->container->get($this->depClass);
                $obj = new class {
                    public function handle(TestDependency $dep): string
                    {
                        return $dep->getValue();
                    }
                };
                // This won't work with anonymous classes for type hints
                // Let's use a simpler approach
                return 'test';
            }
        };

        // Simpler test with a real class
        $this->container->singleton(TestDependency::class, fn () => new TestDependency('injected'));

        $handler = new TestHandler();
        $result = $this->invoker->call($handler, 'handle');

        $this->assertSame('injected', $result);
    }

    public function test_call_uses_explicit_parameters_by_name(): void
    {
        $handler = new TestHandlerWithPrimitive();

        $result = $this->invoker->call($handler, 'handle', ['name' => 'World']);

        $this->assertSame('Hello, World!', $result);
    }

    public function test_explicit_parameters_take_priority_over_container(): void
    {
        $this->container->singleton(TestDependency::class, fn () => new TestDependency('from-container'));

        $explicitDep = new TestDependency('from-explicit');
        $handler = new TestHandler();

        $result = $this->invoker->call($handler, 'handle', ['dep' => $explicitDep]);

        $this->assertSame('from-explicit', $result);
    }

    public function test_call_uses_default_values(): void
    {
        $handler = new TestHandlerWithDefault();

        $result = $this->invoker->call($handler, 'handle');

        $this->assertSame('Hello, default!', $result);
    }

    public function test_call_prefers_explicit_over_default(): void
    {
        $handler = new TestHandlerWithDefault();

        $result = $this->invoker->call($handler, 'handle', ['name' => 'custom']);

        $this->assertSame('Hello, custom!', $result);
    }

    public function test_call_resolves_multiple_dependencies(): void
    {
        $this->container->singleton(TestDependency::class, fn () => new TestDependency('first'));
        $this->container->singleton(AnotherDependency::class, fn () => new AnotherDependency(42));

        $handler = new TestHandlerWithMultipleDeps();

        $result = $this->invoker->call($handler, 'handle');

        $this->assertSame('first-42', $result);
    }

    public function test_call_mixes_container_and_explicit_parameters(): void
    {
        $this->container->singleton(TestDependency::class, fn () => new TestDependency('injected'));

        $handler = new TestHandlerWithMixed();

        $result = $this->invoker->call($handler, 'handle', ['multiplier' => 3]);

        $this->assertSame('injected-injected-injected', $result);
    }

    public function test_call_throws_for_unresolvable_parameter(): void
    {
        $handler = new TestHandlerWithPrimitive();

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Cannot resolve parameter $name');

        $this->invoker->call($handler, 'handle');
    }

    public function test_call_handles_nullable_types_with_null_default(): void
    {
        $handler = new TestHandlerWithNullable();

        $result = $this->invoker->call($handler, 'handle');

        $this->assertSame('no-dep', $result);
    }

    public function test_call_resolves_nullable_type_from_container_when_bound(): void
    {
        $this->container->singleton(TestDependency::class, fn () => new TestDependency('resolved'));

        $handler = new TestHandlerWithNullable();

        $result = $this->invoker->call($handler, 'handle');

        $this->assertSame('resolved', $result);
    }

    public function test_call_returns_method_return_value(): void
    {
        $handler = new class {
            public function calculate(): int
            {
                return 42;
            }
        };

        $result = $this->invoker->call($handler, 'calculate');

        $this->assertSame(42, $result);
    }

    public function test_call_works_with_void_return_type(): void
    {
        $handler = new class {
            public bool $called = false;

            public function process(): void
            {
                $this->called = true;
            }
        };

        $result = $this->invoker->call($handler, 'process');

        $this->assertNull($result);
        $this->assertTrue($handler->called);
    }

    public function test_make_creates_instance_with_no_constructor(): void
    {
        $result = $this->invoker->make(TestClassNoConstructor::class);

        $this->assertInstanceOf(TestClassNoConstructor::class, $result);
    }

    public function test_make_resolves_constructor_dependencies_from_container(): void
    {
        $this->container->singleton(TestDependency::class, fn () => new TestDependency('injected'));

        $result = $this->invoker->make(TestClassWithDependency::class);

        $this->assertInstanceOf(TestClassWithDependency::class, $result);
        $this->assertSame('injected', $result->getValue());
    }

    public function test_make_uses_explicit_parameters(): void
    {
        $dep = new TestDependency('explicit');

        $result = $this->invoker->make(TestClassWithDependency::class, ['dep' => $dep]);

        $this->assertSame('explicit', $result->getValue());
    }

    public function test_make_mixes_explicit_and_container_parameters(): void
    {
        $this->container->singleton(AnotherDependency::class, fn () => new AnotherDependency(99));

        $result = $this->invoker->make(TestClassWithMixedDeps::class, [
            'name' => 'test',
        ]);

        $this->assertSame('test-99', $result->getResult());
    }

    public function test_make_uses_default_constructor_values(): void
    {
        $this->container->singleton(TestDependency::class, fn () => new TestDependency('injected'));

        $result = $this->invoker->make(TestClassWithDefaultParam::class);

        $this->assertSame('injected-default', $result->getResult());
    }
}

class TestDependency
{
    public function __construct(
        private string $value,
    ) {
    }

    public function getValue(): string
    {
        return $this->value;
    }
}

class AnotherDependency
{
    public function __construct(
        private int $number,
    ) {
    }

    public function getNumber(): int
    {
        return $this->number;
    }
}

class TestHandler
{
    public function handle(TestDependency $dep): string
    {
        return $dep->getValue();
    }
}

class TestHandlerWithPrimitive
{
    public function handle(string $name): string
    {
        return "Hello, {$name}!";
    }
}

class TestHandlerWithDefault
{
    public function handle(string $name = 'default'): string
    {
        return "Hello, {$name}!";
    }
}

class TestHandlerWithMultipleDeps
{
    public function handle(TestDependency $dep1, AnotherDependency $dep2): string
    {
        return $dep1->getValue() . '-' . $dep2->getNumber();
    }
}

class TestHandlerWithMixed
{
    public function handle(TestDependency $dep, int $multiplier): string
    {
        return implode('-', array_fill(0, $multiplier, $dep->getValue()));
    }
}

class TestHandlerWithNullable
{
    public function handle(?TestDependency $dep = null): string
    {
        return $dep?->getValue() ?? 'no-dep';
    }
}

class TestClassNoConstructor
{
    public function getValue(): string
    {
        return 'no-constructor';
    }
}

class TestClassWithDependency
{
    public function __construct(
        private TestDependency $dep,
    ) {
    }

    public function getValue(): string
    {
        return $this->dep->getValue();
    }
}

class TestClassWithMixedDeps
{
    public function __construct(
        private string $name,
        private AnotherDependency $dep,
    ) {
    }

    public function getResult(): string
    {
        return $this->name . '-' . $this->dep->getNumber();
    }
}

class TestClassWithDefaultParam
{
    public function __construct(
        private TestDependency $dep,
        private string $suffix = 'default',
    ) {
    }

    public function getResult(): string
    {
        return $this->dep->getValue() . '-' . $this->suffix;
    }
}
