# Dependency Injection

Helm uses [DI52](https://github.com/lucatume/di52) for dependency injection. Each domain has a `Provider.php` that registers its classes. The container auto-wires constructor dependencies — you almost never need to write factory closures.

## Registration

### Auto-Wiring (Default)

Register a class and DI52 reflects on its constructor, resolving type-hinted parameters automatically:

```php
$this->container->singleton(ActionProcessor::class);
```

If `ActionProcessor` has this constructor:

```php
public function __construct(
    private readonly ActionRepository $actionRepository,
    private readonly ActionResolver $actionResolver,
) {}
```

DI52 resolves both parameters from the container. This works for any class-typed parameter that is itself registered or auto-constructible.

### Scalar Parameters

DI52 cannot auto-wire scalars (strings, ints, arrays). Use contextual binding:

```php
$this->container->when(StarCatalog::class)
    ->needs('$catalogPath')
    ->give(HELM_PATH . 'data/stars_100ly.json');

$this->container->singleton(StarCatalog::class);
```

The `needs()` argument is the parameter name with a `$` prefix. The `give()` value can be a literal or a closure:

```php
->give(static fn(): int => get_option('helm_port', 3306));
```

### Interface Binding

Bind an interface to its implementation:

```php
$this->container->when(ViewRenderer::class)
    ->needs('$directory')
    ->give(dirname(__DIR__, 2) . '/views');

$this->container->singleton(View::class, ViewRenderer::class);
```

When any class type-hints `View`, it receives a `ViewRenderer` instance.

### Container Injection

DI52 auto-resolves its own `Container` class. Classes that need the container can type-hint it directly:

```php
public function __construct(
    private readonly Container $container,
    private readonly ActionRepository $actionRepository,
) {}
```

No special registration needed — `singleton(ActionFactory::class)` handles it.

## Hook Wiring

### Container Callbacks (Preferred)

Use `$this->container->callback()` to wire hooks. It returns a closure that defers class resolution until the hook fires:

```php
public function boot(): void
{
    add_action(ActionProcessor::HOOK, $this->container->callback(ActionProcessor::class, 'processReady'));
    add_filter('heartbeat_received', $this->container->callback(ActionHeartbeat::class, 'handle'), 10, 2);
}
```

The class is only instantiated when WordPress fires the hook. For singletons, the closure is cached internally.

### When `[$this, 'method']` Is Appropriate

Some hook handlers have complex logic that doesn't belong in a domain class — form handling with nonce verification, multi-service orchestration, etc. These can live on the provider:

```php
public function boot(): void
{
    add_action('admin_post_helm_generate_planets', [$this, 'handleGeneratePlanets']);
}

public function handleGeneratePlanets(): void
{
    // Nonce check, capability check, multi-service coordination...
}
```

Avoid creating methods that just delegate a single call. If the method body is `$this->container->get(X::class)->doThing()`, use `$this->container->callback()` instead.

## WordPress Globals

Don't inject `$wpdb` through constructors. DI52 will attempt to auto-construct `\wpdb`, which fails because its constructor takes unresolvable scalar parameters (`$dbuser`, `$dbpassword`, etc.).

Use `global $wpdb` directly in methods:

```php
final class DiscoveryRepository
{
    public function countByStarId(string $starId): int
    {
        global $wpdb;

        return (int) $wpdb->get_var(
            $wpdb->prepare("SELECT COUNT(*) FROM {$table} WHERE star_id = %s", $starId)
        );
    }
}
```

This matches WordPress conventions and keeps the class auto-wireable with a bare `singleton()`.

## Provider Structure

A minimal provider:

```php
final class Provider extends ServiceProvider
{
    public function register(): void
    {
        $this->container->singleton(MyRepository::class);
        $this->container->singleton(MyService::class);
    }

    public function boot(): void
    {
        add_action('my_hook', $this->container->callback(MyService::class, 'handle'));
    }
}
```

### Guidelines

-   **No factory closures** unless you need conditional logic or multi-step initialization
-   **No unused imports** — auto-wiring means the provider doesn't reference dependency classes
-   **`register()` for bindings**, `boot()` for hooks — all providers are registered before any boot
-   **One singleton per class** — DI52 handles the dependency graph

## When You Still Need a Factory Closure

Rare cases where auto-wiring isn't enough:

-   **Conditional initialization** — different implementations based on runtime state
-   **Multi-step setup** — object needs method calls after construction
-   **Non-class dependencies from WordPress** — values only available at runtime via function calls that can't be expressed as `when()->needs()->give()`

```php
$this->container->singleton(MyService::class, function () {
    $service = new MyService(
        $this->container->get(Config::class),
    );
    $service->setDebug(defined('WP_DEBUG') && WP_DEBUG);
    return $service;
});
```

In practice, Helm has zero factory closures across all providers.
