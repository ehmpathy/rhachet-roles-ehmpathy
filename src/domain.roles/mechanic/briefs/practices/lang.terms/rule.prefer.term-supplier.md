### .rule = prefer-term-supplier

#### .what
prefer `supplier` over `provider` when naming mechanisms that supply data, services, or dependencies

#### .why

**providers are agents — suppliers are mechanisms**
- a `provider` implies agency — a robot or human who actively *does things* for others
- a `supplier` implies a mechanism — something that *supplies* when asked
- in software, most "providers" are actually suppliers: they don't act autonomously, they respond to requests

**semantic precision**
- `provider` suggests ongoing care, decision-making, service relationship (think: healthcare provider, service provider)
- `supplier` suggests a source that delivers when called upon (think: parts supplier, data supplier)
- software dependencies and data sources fit the supplier model — they supply on demand

**common misuse**
- `AuthProvider` — rarely "provides" anything autonomously; it *supplies* auth state when queried
- `ConfigProvider` — doesn't actively provide; it *supplies* config values on access
- `DataProvider` — supplies data when requested, doesn't proactively deliver

#### .scope
- applies to naming mechanisms, classes, interfaces, and modules
- especially relevant for dependency injection, react context, and data access patterns

#### .examples

##### 👍 good — supplier for mechanisms
```ts
// supplies auth state when accessed
const authSupplier = createAuthSupplier();
const user = authSupplier.get();

// supplies configuration values
interface ConfigSupplier {
  get(key: string): string | null;
}

// supplies data from external source
const dataSupplier = createApiDataSupplier({ baseUrl });
const records = await dataSupplier.fetch({ query });
```

##### 👎 bad — provider for non-agent mechanisms
```ts
// 👎 "provider" but it just supplies state
const authProvider = createAuthProvider();

// 👎 "provider" but it just supplies config
interface ConfigProvider {
  get(key: string): string | null;
}

// 👎 "provider" but it just supplies data
const dataProvider = createApiDataProvider({ baseUrl });
```

##### 👍 good — provider for actual agents
```ts
// 👍 actual agent that provides services (human or robot)
interface ServiceProvider {
  name: string;
  providesService(request: ServiceRequest): Promise<ServiceResult>;
}

// 👍 external org that provides capabilities
const cloudProvider = 'aws'; // amazon provides cloud services as an agent
```

#### .exception
- external library apis that use `provider` (e.g., react's `Context.Provider`) — match their conventions at boundaries
- domain terms where `provider` has established meaning (e.g., `healthcareProvider`, `serviceProvider` as business entities)

#### .enforcement
- `provider` for non-agent mechanisms = **NITPICK**
- prefer `supplier` for dependency injection, data sources, and state access

#### .see also
- `rule.require.ubiqlang` — consistent terminology
- `rule.forbid.term-script` — another term precision rule
